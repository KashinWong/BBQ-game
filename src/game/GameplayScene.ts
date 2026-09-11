import Phaser from "phaser";
import { calculateOrderPatienceSeconds } from "./orderTiming";
import { buildIngredientRack } from "./prepLayout";
import {
  evaluateService,
  getLevelConfig,
  isPerfectDoneness,
  LEVEL_ONE,
  LEVEL_ONE_DONENESS,
  starsForScore,
  type IngredientKind,
  type LevelId,
  type LevelOneConfig,
} from "./levelOneRules";
import { loadProgress, recordLevelOneResult, recordLevelResult } from "./progress";
import { advanceTutorial, type TutorialEvent, type TutorialStep } from "./tutorialFlow";
import { BrowserFeedback } from "../platform/BrowserFeedback";
import { SKEWER_INTERACTION } from "./interactionGeometry";
import { ingredientPositionAt } from "./ingredientMotion";
import type { GameProgress } from "./progress";
import { findMatchingOrderIndex, recipeMatches } from "./orderQueue";
import { buildGrillSlots, type GrillSlotPosition } from "./grillLayout";
import { discardActionForSkewer } from "./trashActions";
import { createBrowserSettingsStore } from "./browserSettings";
import { showSettingsPanel } from "./SettingsPanel";

type SkewerLocation = "prep" | "dragging" | "tray" | "grill";

interface RectSpec {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface LayoutSpec {
  name: string;
  order: RectSpec;
  grill: RectSpec;
  prep: RectSpec;
  tray: RectSpec;
  trash: RectSpec;
  skewerStart: { x: number; y: number };
}

interface FoodDefinition {
  label: string;
  shortLabel: string;
  color: number;
  cookedColor: number;
  burntColor: number;
  cookSeconds: number;
}

interface PieceState {
  kind: IngredientKind;
  sides: [number, number];
}

interface PieceView {
  body: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  sideA: Phaser.GameObjects.Rectangle;
  sideB: Phaser.GameObjects.Rectangle;
}

interface SkewerState {
  id: number;
  view: Phaser.GameObjects.Container;
  pieces: PieceState[];
  pieceViews: PieceView[];
  location: SkewerLocation;
  downSide: 0 | 1;
  grillSlot: number | null;
  lastVisualBand: string;
}

interface MovingIngredient {
  kind: IngredientKind;
  view: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Rectangle;
  homeX: number;
  homeY: number;
  phase: number;
  direction: -1 | 1;
}

interface OrderState {
  recipe: IngredientKind[];
  patience: number;
  maxPatience: number;
}

interface OrderView {
  rect: RectSpec;
  recipeText: Phaser.GameObjects.Text;
  patienceFill: Phaser.GameObjects.Rectangle;
  patienceText: Phaser.GameObjects.Text;
  barWidth: number;
}

interface ActivePointer {
  skewer: SkewerState;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  grabOffsetX: number;
  grabOffsetY: number;
  source: SkewerLocation;
  sourceSlot: number | null;
  dragging: boolean;
  trashHoverStarted: number | null;
  trashCleared: boolean;
}

const WORLD_WIDTH = 390;
const WORLD_HEIGHT = 844;
const MAX_SKEWER_PIECES = 4;

const FOOD: Record<IngredientKind, FoodDefinition> = {
  beef: {
    label: "牛肉",
    shortLabel: "🥩",
    color: 0xb85c5c,
    cookedColor: 0x8a4a2f,
    burntColor: 0x292524,
    cookSeconds: 5,
  },
  pepper: {
    label: "青椒",
    shortLabel: "🫑",
    color: 0x4d9b56,
    cookedColor: 0x7b9239,
    burntColor: 0x303725,
    cookSeconds: 3.5,
  },
  mushroom: {
    label: "蘑菇",
    shortLabel: "🍄",
    color: 0xd6c1a5,
    cookedColor: 0xa7835e,
    burntColor: 0x39302a,
    cookSeconds: 4,
  },
  sausage: {
    label: "香肠",
    shortLabel: "🌭",
    color: 0xd85f48,
    cookedColor: 0xa63d2d,
    burntColor: 0x30201d,
    cookSeconds: 5,
  },
  corn: {
    label: "玉米",
    shortLabel: "🌽",
    color: 0xeabf39,
    cookedColor: 0xc89022,
    burntColor: 0x3d3020,
    cookSeconds: 5.5,
  },
  chicken: {
    label: "鸡肉",
    shortLabel: "🍗",
    color: 0xe7a47b,
    cookedColor: 0xb96942,
    burntColor: 0x3a2722,
    cookSeconds: 6,
  },
};

const LAYOUT: LayoutSpec = {
  name: "第 1 关 · 夜市初营业",
  order: { x: 15, y: 76, width: 360, height: 116 },
  grill: { x: 15, y: 202, width: 360, height: 250 },
  tray: { x: 15, y: 462, width: 174, height: 68 },
  trash: { x: 201, y: 462, width: 174, height: 68 },
  prep: { x: 15, y: 540, width: 360, height: 245 },
  skewerStart: { x: 112, y: 748 },
};

export class GameplayScene extends Phaser.Scene {
  private readonly layout = LAYOUT;
  private readonly settings = createBrowserSettingsStore();
  private readonly feedback = new BrowserFeedback(() => this.settings.get());
  private level: LevelOneConfig = LEVEL_ONE;
  private levelId: LevelId = 1;
  private grillPositions: GrillSlotPosition[] = buildGrillSlots(2);

  private movingIngredients: MovingIngredient[] = [];
  private allSkewers = new Set<SkewerState>();
  private grillSlots: Array<SkewerState | null> = [null, null];
  private traySkewer: SkewerState | null = null;
  private prepSkewer: SkewerState | null = null;
  private activePointer: ActivePointer | null = null;

  private score = 0;
  private combo = 0;
  private maxCombo = 0;
  private timeRemaining = LEVEL_ONE.durationSeconds;
  private completedOrders = 0;
  private perfectOrders = 0;
  private nextSkewerId = 1;
  private nextRecipeIndex = 0;
  private pendingIngredientPickups = 0;
  private ingredientMotionElapsed = 0;
  private started = false;
  private ended = false;
  private clockPaused = false;
  private manualPaused = false;
  private tutorialPaused = false;
  private oneStarAnnounced = false;
  private tutorialActive = true;
  private tutorialStep: TutorialStep = "select-food";
  private storage?: Storage;
  private settingsPanel?: Phaser.GameObjects.Container;

  private orders: OrderState[] = [];
  private orderViews: OrderView[] = [];
  private scoreText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private toastText!: Phaser.GameObjects.Text;
  private goalText!: Phaser.GameObjects.Text;
  private tutorialText!: Phaser.GameObjects.Text;
  private tutorialGlow!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: "Gameplay" });
  }

  init(data: { levelId?: number }): void {
    this.level = getLevelConfig(data.levelId ?? 1);
    this.levelId = this.level.id;
    this.grillPositions = buildGrillSlots(this.level.grillSlots);
  }

  create(): void {
    this.resetRuntimeState();
    this.drawLayout();
    this.createHud();
    this.createOrders();
    this.spawnIngredientWave();
    this.createPrepSkewer();
    this.bindInput();
    this.updateHud();
    try {
      this.storage = window.localStorage;
      this.tutorialActive = this.level.tutorial && !loadProgress(this.storage).tutorialCompleted;
    } catch {
      this.storage = undefined;
      this.tutorialActive = this.level.tutorial;
    }
    this.tutorialStep = this.tutorialActive ? "select-food" : "complete";
    this.showLevelIntro();

    this.game.events.on(Phaser.Core.Events.BLUR, this.pauseClock, this);
    this.game.events.on(Phaser.Core.Events.FOCUS, this.resumeClock, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(Phaser.Core.Events.BLUR, this.pauseClock, this);
      this.game.events.off(Phaser.Core.Events.FOCUS, this.resumeClock, this);
    });
  }

  update(_time: number, delta: number): void {
    if (this.ended || !this.started || this.clockPaused || this.manualPaused || this.tutorialPaused) return;

    const seconds = Math.min(delta, 100) / 1000;
    this.ingredientMotionElapsed += seconds;
    this.updateIngredientMotion(this.ingredientMotionElapsed);
    const timersAreFrozen = this.tutorialActive && this.level.pauseTimersDuringTutorial;
    if (!timersAreFrozen) {
      this.timeRemaining = Math.max(0, this.timeRemaining - seconds);
      for (const order of this.orders) {
        order.patience = Math.max(0, order.patience - seconds);
      }
    }
    this.updateCooking(seconds);
    this.updateTrashHold();

    const expiredOrderIndex = this.orders.findIndex((order) => order.patience <= 0);
    if (!timersAreFrozen && expiredOrderIndex >= 0) {
      this.score = Math.max(0, this.score - 30);
      this.combo = 0;
      this.showToast("订单超时  -30", 0xfca5a5);
      this.createOrder(expiredOrderIndex);
    }

    if (!timersAreFrozen && this.timeRemaining <= 0) {
      this.finishRound();
      return;
    }

    this.updateHud();
  }

  private resetRuntimeState(): void {
    this.movingIngredients = [];
    this.allSkewers = new Set<SkewerState>();
    this.grillSlots = Array.from({ length: this.level.grillSlots }, () => null);
    this.traySkewer = null;
    this.prepSkewer = null;
    this.activePointer = null;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.timeRemaining = this.level.durationSeconds;
    this.completedOrders = 0;
    this.perfectOrders = 0;
    this.nextSkewerId = 1;
    this.nextRecipeIndex = 0;
    this.pendingIngredientPickups = 0;
    this.ingredientMotionElapsed = 0;
    this.started = false;
    this.ended = false;
    this.clockPaused = false;
    this.manualPaused = false;
    this.tutorialPaused = false;
    this.oneStarAnnounced = false;
    this.tutorialActive = this.level.tutorial;
    this.tutorialStep = "select-food";
    this.storage = undefined;
    this.orders = [];
    this.orderViews = [];
  }

  private drawLayout(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x160b14, 1).fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    graphics.fillStyle(0x291326, 1).fillRect(0, 0, WORLD_WIDTH, 210);
    graphics.fillStyle(0x402012, 1).fillRect(0, 210, WORLD_WIDTH, WORLD_HEIGHT - 210);
    graphics.fillStyle(0x2d1710, 0.8).fillCircle(52, 116, 82);
    graphics.fillStyle(0x532516, 0.5).fillCircle(348, 168, 104);

    graphics.lineStyle(2, 0x9a5b35, 0.75).lineBetween(0, 70, WORLD_WIDTH, 54);
    for (let x = 24; x <= WORLD_WIDTH; x += 58) {
      const y = 66 - x * 0.04;
      graphics.fillStyle(0xf6b84a, 0.9).fillCircle(x, y, 4);
      graphics.fillStyle(0xffcf70, 0.16).fillCircle(x, y, 11);
    }
    graphics.fillStyle(0x2b1712, 0.95).fillRoundedRect(8, 8, 374, 58, 16);
    graphics.lineStyle(1.5, 0x7c4a2c, 0.7).strokeRoundedRect(8, 8, 374, 58, 16);

    this.drawPanel(graphics, this.layout.order, 0x42281d, 0xf0a35a);
    this.drawPanel(graphics, this.layout.grill, 0x241816, 0x9d5a38);
    this.drawPanel(graphics, this.layout.prep, 0x4a2818, 0xb86a3d);
    this.drawPanel(graphics, this.layout.tray, 0x604229, 0xc69a61);
    this.drawPanel(graphics, this.layout.trash, 0x3a2220, 0xa4554f);

    for (let y = this.layout.prep.y + 16; y < this.layout.prep.y + this.layout.prep.height; y += 29) {
      graphics.lineStyle(1, 0x7d4528, 0.45).lineBetween(this.layout.prep.x + 8, y, this.layout.prep.x + this.layout.prep.width - 8, y);
    }

    graphics.lineStyle(3, 0x6b4b38, 1);
    for (let y = this.layout.grill.y + 30; y < this.layout.grill.y + this.layout.grill.height - 10; y += 18) {
      graphics.lineBetween(this.layout.grill.x + 12, y, this.layout.grill.x + this.layout.grill.width - 12, y);
    }
    for (let x = this.layout.grill.x + 28; x < this.layout.grill.x + this.layout.grill.width - 20; x += 34) {
      graphics.fillStyle(0x7f1d1d, 0.75).fillCircle(x, this.layout.grill.y + this.layout.grill.height - 20, 9);
      graphics.fillStyle(0xfb923c, 0.72).fillCircle(x + 2, this.layout.grill.y + this.layout.grill.height - 22, 4);
    }

    const slotHeight = this.level.grillSlots === 3 ? 56 : 68;
    this.grillPositions.forEach(({ x, y }, index) => {
      graphics.fillStyle(0x171412, 0.6).fillRoundedRect(x - 95, y - slotHeight / 2, 190, slotHeight, 14);
      graphics.lineStyle(2, 0xc17a4a, 0.55).strokeRoundedRect(x - 95, y - slotHeight / 2, 190, slotHeight, 14);
      this.add.text(x, y, `烤位 ${index + 1}`, {
        fontFamily: "inherit",
        fontSize: "12px",
        color: "#a88b7b",
      }).setOrigin(0.5);
    });

    if (this.level.simultaneousOrders === 1) {
      this.add.circle(this.layout.order.x + 31, this.layout.order.y + 54, 20, 0xf2c49d)
        .setStrokeStyle(3, 0x7c3f24, 1);
      this.add.text(this.layout.order.x + 31, this.layout.order.y + 55, "😋", {
        fontFamily: "inherit",
        fontSize: "23px",
      }).setOrigin(0.5);
    }
    this.add.text(
      this.layout.order.x + (this.level.simultaneousOrders === 1 ? 58 : 12),
      this.layout.order.y + 8,
      this.level.simultaneousOrders === 1 ? "顾客订单 · 烤好后拖来出餐" : "双订单 · 烤好拖来会自动匹配顾客",
      {
      fontFamily: "inherit",
      fontSize: this.level.simultaneousOrders === 1 ? "12px" : "11px",
      fontStyle: "bold",
      color: "#ffe0b2",
      lineSpacing: 2,
      },
    );
    this.add.text(this.layout.grill.x + 12, this.layout.grill.y + 10, "炭火烤架 · 点击烤串翻面", {
      fontFamily: "inherit",
      fontSize: "12px",
      fontStyle: "bold",
      color: "#ffc078",
    });
    this.add.text(this.layout.prep.x + 12, this.layout.prep.y + 10, "点击食材 · 黄框是当前订单目标", {
      fontFamily: "inherit",
      fontSize: "12px",
      fontStyle: "bold",
      color: "#ffe4bd",
    });
    this.add.text(this.layout.tray.x + this.layout.tray.width / 2, this.layout.tray.y + 13, "待烤托盘", {
      fontFamily: "inherit",
      fontSize: "12px",
      color: "#d6d3d1",
    }).setOrigin(0.5, 0);
    this.add.text(this.layout.trash.x + this.layout.trash.width / 2, this.layout.trash.y + 13, "垃圾桶", {
      fontFamily: "inherit",
      fontSize: "12px",
      color: "#fecaca",
    }).setOrigin(0.5, 0);
    this.add.text(this.layout.trash.x + this.layout.trash.width / 2, this.layout.trash.y + 36, "拖入撤销 · 停留清空", {
      fontFamily: "inherit",
      fontSize: "10px",
      color: "#a8a29e",
    }).setOrigin(0.5, 0);
    this.add.text(222, 754, "按住签子任意位置拖动", {
      fontFamily: "inherit",
      fontSize: "11px",
      color: "#e9bd8e",
    }).setOrigin(0, 0.5);
  }

  private drawPanel(graphics: Phaser.GameObjects.Graphics, rect: RectSpec, fill: number, stroke: number): void {
    graphics.fillStyle(fill, 1).fillRoundedRect(rect.x, rect.y, rect.width, rect.height, 16);
    graphics.lineStyle(2, stroke, 0.75).strokeRoundedRect(rect.x, rect.y, rect.width, rect.height, 16);
  }

  private createHud(): void {
    this.add.text(20, 19, "烤串高手", {
      fontFamily: "inherit",
      fontSize: "18px",
      fontStyle: "bold",
      color: "#fff7ed",
    });
    this.add.text(20, 43, `第 ${this.level.id} 关 · ${this.level.title}`, {
      fontFamily: "inherit",
      fontSize: "10px",
      color: "#d6a97f",
    });

    this.scoreText = this.add.text(153, 19, "积分 0", {
      fontFamily: "inherit",
      fontSize: "15px",
      fontStyle: "bold",
      color: "#fde68a",
    });
    this.timerText = this.add.text(275, 18, "90.0s", {
      fontFamily: "inherit",
      fontSize: "17px",
      fontStyle: "bold",
      color: "#ffffff",
    });
    this.comboText = this.add.text(153, 42, "连击 x0", {
      fontFamily: "inherit",
      fontSize: "10px",
      color: "#fdba74",
    });
    this.goalText = this.add.text(275, 43, `目标 ${this.level.starScores[0]}`, {
      fontFamily: "inherit",
      fontSize: "10px",
      color: "#fef3c7",
    });

    const pause = this.add.text(360, 31, "Ⅱ", {
      fontFamily: "inherit",
      fontSize: "16px",
      fontStyle: "bold",
      color: "#d6d3d1",
      backgroundColor: "#403936",
      padding: { left: 9, right: 9, top: 6, bottom: 6 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    pause.on("pointerdown", () => this.showPauseDialog());

    this.toastText = this.add.text(WORLD_WIDTH / 2, 68, "", {
      fontFamily: "inherit",
      fontSize: "13px",
      fontStyle: "bold",
      color: "#fff7ed",
      backgroundColor: "#171412",
      padding: { left: 10, right: 10, top: 5, bottom: 5 },
    }).setOrigin(0.5, 0).setDepth(300).setAlpha(0);

    this.tutorialGlow = this.add.graphics().setDepth(275).setVisible(false);
    this.tutorialText = this.add.text(WORLD_WIDTH / 2, 532, "", {
      fontFamily: "inherit",
      fontSize: "14px",
      fontStyle: "bold",
      color: "#422006",
      backgroundColor: "#fef3c7",
      padding: { left: 15, right: 15, top: 9, bottom: 9 },
      align: "center",
      wordWrap: { width: 330 },
    }).setOrigin(0.5, 1).setDepth(280).setVisible(false);
  }

  private showLevelIntro(): void {
    const progress = this.storage ? loadProgress(this.storage) : undefined;
    const layer = this.add.container(0, 0).setDepth(600);
    const veil = this.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, 0x140d0a, 0.9);
    const card = this.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 330, 430, 0x3d2418, 1)
      .setStrokeStyle(3, 0xf6b84a, 0.95);
    const badge = this.add.text(WORLD_WIDTH / 2, 246, `第 ${this.level.id} 关`, {
      fontFamily: "inherit",
      fontSize: "14px",
      fontStyle: "bold",
      color: "#3b1d0b",
      backgroundColor: "#f6b84a",
      padding: { left: 14, right: 14, top: 5, bottom: 5 },
    }).setOrigin(0.5);
    const title = this.add.text(WORLD_WIDTH / 2, 298, this.level.title, {
      fontFamily: "inherit",
      fontSize: "30px",
      fontStyle: "bold",
      color: "#fff7ed",
    }).setOrigin(0.5);
    const rules = this.add.text(
      WORLD_WIDTH / 2,
      385,
      `${this.level.durationSeconds} 秒内完成订单\n达到 ${this.level.starScores[0]} 分即可过关\n\n${this.level.ingredientKinds.map((kind) => `${FOOD[kind].shortLabel} ${FOOD[kind].label}`).join("   ")}`,
      {
        fontFamily: "inherit",
        fontSize: "16px",
        color: "#f8dcc2",
        align: "center",
        lineSpacing: 10,
      },
    ).setOrigin(0.5);
    const record = this.add.text(
      WORLD_WIDTH / 2,
      480,
      progress && this.bestScoreFor(progress) > 0
        ? `历史最高 ${this.bestScoreFor(progress)} 分 · ${"★".repeat(this.bestStarsFor(progress))}`
        : this.tutorialActive ? "首次挑战将开启互动教学" : "准备刷新你的最高分",
      {
        fontFamily: "inherit",
        fontSize: "12px",
        color: "#d6a97f",
      },
    ).setOrigin(0.5);
    const start = this.add.text(WORLD_WIDTH / 2, 558, "开始烧烤", {
      fontFamily: "inherit",
      fontSize: "20px",
      fontStyle: "bold",
      color: "#321507",
      backgroundColor: "#f6b84a",
      padding: { left: 48, right: 48, top: 14, bottom: 14 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    start.on("pointerdown", () => {
      this.feedback.unlock();
      this.feedback.play("place");
      layer.destroy(true);
      this.beginCountdown();
    });
    layer.add([veil, card, badge, title, rules, record, start]);
  }

  private beginCountdown(): void {
    const countdown = this.add.text(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, "3", {
      fontFamily: "inherit",
      fontSize: "76px",
      fontStyle: "bold",
      color: "#fff7ed",
      stroke: "#7c2d12",
      strokeThickness: 9,
    }).setOrigin(0.5).setDepth(610);
    const steps = ["3", "2", "1", "开烤！"];
    let index = 0;
    const next = () => {
      countdown.setText(steps[index]);
      this.tweens.add({ targets: countdown, scale: 1.18, duration: 180, yoyo: true });
      index += 1;
      if (index < steps.length) {
        this.time.delayedCall(620, next);
        return;
      }
      this.time.delayedCall(430, () => {
        countdown.destroy();
        this.started = true;
        if (this.tutorialActive) this.showTutorialPrompt();
        else this.showToast("看订单，点食材，掌握两面火候！", 0xfef3c7);
      });
    };
    next();
  }

  private advanceTutorialStep(event: TutorialEvent): void {
    if (!this.tutorialActive) return;
    const next = advanceTutorial(this.tutorialStep, event);
    if (next === this.tutorialStep) return;
    this.tutorialStep = next;
    this.showTutorialPrompt();
  }

  private showTutorialPrompt(): void {
    if (!this.tutorialActive || this.tutorialStep === "complete" || this.tutorialStep === "score-explained") {
      this.tutorialText.setVisible(false);
      this.tutorialGlow.setVisible(false);
      return;
    }
    const copy: Record<Exclude<TutorialStep, "complete" | "score-explained">, string> = {
      "select-food": "① 点击黄框食材，按订单配好这一串",
      "place-on-grill": "② 配方完成！把签子拖到任意烤位",
      "cook-first-side": "③ 观察蓝色熟度，等它进入金色最佳区",
      flip: "④ 第一面正好！点击烤串翻面",
      "cook-second-side": "⑤ 继续烤另一面，别让第一面焦掉",
      serve: "⑥ 两面正好！把烤串拖到顾客订单",
    };
    this.tutorialText.setText(copy[this.tutorialStep]).setVisible(true);
    this.tutorialGlow.clear().setVisible(true);
    this.tutorialGlow.lineStyle(4, 0xfde047, 0.95);
    if (this.tutorialStep === "select-food") {
      this.tutorialGlow.strokeRoundedRect(this.layout.prep.x - 3, this.layout.prep.y - 3, this.layout.prep.width + 6, this.layout.prep.height + 6, 18);
    } else if (this.tutorialStep === "serve") {
      this.tutorialGlow.strokeRoundedRect(this.layout.order.x - 3, this.layout.order.y - 3, this.layout.order.width + 6, this.layout.order.height + 6, 18);
    } else {
      this.tutorialGlow.strokeRoundedRect(this.layout.grill.x - 3, this.layout.grill.y - 3, this.layout.grill.width + 6, this.layout.grill.height + 6, 18);
    }
  }

  private showTutorialScore(earned: number): void {
    this.tutorialPaused = true;
    this.tutorialText.setVisible(false);
    this.tutorialGlow.setVisible(false);
    const layer = this.add.container(0, 0).setDepth(620);
    const veil = this.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, 0x140d0a, 0.78);
    const card = this.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 326, 286, 0x3d2418, 1)
      .setStrokeStyle(3, 0xfacc15, 0.95);
    const title = this.add.text(WORLD_WIDTH / 2, 330, "第一串出餐成功！", {
      fontFamily: "inherit",
      fontSize: "25px",
      fontStyle: "bold",
      color: "#fef08a",
    }).setOrigin(0.5);
    const details = this.add.text(WORLD_WIDTH / 2, 405, `本单 +${earned}\n食材火候 + 剩余耐心 × 连击`, {
      fontFamily: "inherit",
      fontSize: "16px",
      color: "#fff7ed",
      align: "center",
      lineSpacing: 12,
    }).setOrigin(0.5);
    const button = this.add.text(WORLD_WIDTH / 2, 492, "继续营业", {
      fontFamily: "inherit",
      fontSize: "18px",
      fontStyle: "bold",
      color: "#321507",
      backgroundColor: "#f6b84a",
      padding: { left: 38, right: 38, top: 12, bottom: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    button.on("pointerdown", () => {
      this.advanceTutorialStep("continued");
      this.tutorialActive = false;
      this.tutorialPaused = false;
      if (this.storage) {
        recordLevelOneResult(this.storage, { score: 0, stars: 0, tutorialCompleted: true });
      }
      layer.destroy(true);
      this.showToast(`教学完成，冲击 ${this.level.starScores[0]} 分！`, 0xfef08a);
    });
    layer.add([veil, card, title, details, button]);
  }

  private showPauseDialog(): void {
    if (!this.started || this.ended || this.manualPaused) return;
    this.cancelActivePointer();
    this.manualPaused = true;
    const layer = this.add.container(0, 0).setDepth(700);
    const veil = this.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, 0x0c0705, 0.84);
    const card = this.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 320, 440, 0x3d2418, 1)
      .setStrokeStyle(2, 0xf6b84a, 0.9);
    const title = this.add.text(WORLD_WIDTH / 2, 270, "暂停营业", {
      fontFamily: "inherit",
      fontSize: "28px",
      fontStyle: "bold",
      color: "#fff7ed",
    }).setOrigin(0.5);
    const help = this.add.text(WORLD_WIDTH / 2, 354, "点击食材自动上签\n拖到烤位 · 点击翻面\n两面金黄后拖到订单出餐", {
      fontFamily: "inherit",
      fontSize: "15px",
      color: "#e7c9ad",
      align: "center",
      lineSpacing: 10,
    }).setOrigin(0.5);
    const resume = this.add.text(WORLD_WIDTH / 2, 454, "继续游戏", {
      fontFamily: "inherit",
      fontSize: "18px",
      fontStyle: "bold",
      color: "#321507",
      backgroundColor: "#f6b84a",
      padding: { left: 44, right: 44, top: 11, bottom: 11 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    const settings = this.add.text(WORLD_WIDTH / 2, 510, "⚙ 设置", {
      fontFamily: "inherit",
      fontSize: "15px",
      color: "#fed7aa",
      padding: { left: 30, right: 30, top: 8, bottom: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    const restart = this.add.text(WORLD_WIDTH / 2, 566, "重新开始", {
      fontFamily: "inherit",
      fontSize: "15px",
      color: "#fed7aa",
      padding: { left: 30, right: 30, top: 8, bottom: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    resume.on("pointerdown", () => {
      layer.destroy(true);
      this.manualPaused = false;
    });
    settings.on("pointerdown", () => this.openSettings());
    const select = this.add.text(WORLD_WIDTH / 2, 610, "返回选关", {
      fontFamily: "inherit",
      fontSize: "14px",
      color: "#d6d3d1",
      padding: { left: 30, right: 30, top: 7, bottom: 7 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    restart.on("pointerdown", () => this.scene.restart({ levelId: this.levelId }));
    select.on("pointerdown", () => this.scene.start("LevelSelect"));
    layer.add([veil, card, title, help, resume, settings, restart, select]);
  }

  private openSettings(): void {
    if (this.settingsPanel?.active) return;
    this.settingsPanel = showSettingsPanel(this, this.settings, () => {
      this.settingsPanel = undefined;
    });
  }

  private createOrders(): void {
    for (let index = 0; index < this.level.simultaneousOrders; index += 1) {
      this.orderViews.push(this.createOrderView(index));
      this.createOrder(index);
    }
  }

  private createOrder(index: number): void {
    const recipe = [...this.level.recipes[this.nextRecipeIndex % this.level.recipes.length]];
    this.nextRecipeIndex += 1;
    const patience = calculateOrderPatienceSeconds(recipe, FOOD);
    this.orders[index] = { recipe, patience, maxPatience: patience };
    this.updateOrderView(index);
    this.refreshIngredientTargets();
  }

  private createOrderView(index: number): OrderView {
    const isDual = this.level.simultaneousOrders === 2;
    if (!isDual) {
      const centerX = this.layout.order.x + this.layout.order.width / 2 + 24;
      const centerY = this.layout.order.y + this.layout.order.height / 2;
      const recipeText = this.add.text(centerX, centerY, "", {
        fontFamily: "inherit",
        fontSize: "18px",
        fontStyle: "bold",
        color: "#ffffff",
        align: "center",
        lineSpacing: 7,
        wordWrap: { width: this.layout.order.width - 82 },
      }).setOrigin(0.5);

      this.add.rectangle(
        this.layout.order.x + this.layout.order.width / 2,
        this.layout.order.y + this.layout.order.height - 14,
        this.layout.order.width - 28,
        8,
        0x17202a,
      );
      const patienceFill = this.add.rectangle(
        this.layout.order.x + 14,
        this.layout.order.y + this.layout.order.height - 14,
        this.layout.order.width - 28,
        8,
        0x60a5fa,
      ).setOrigin(0, 0.5);
      const patienceText = this.add.text(
        this.layout.order.x + this.layout.order.width - 14,
        this.layout.order.y + this.layout.order.height - 32,
        "",
        {
          fontFamily: "inherit",
          fontSize: "10px",
          color: "#bfdbfe",
        },
      ).setOrigin(1, 0.5);
      return {
        rect: this.layout.order,
        recipeText,
        patienceFill,
        patienceText,
        barWidth: this.layout.order.width - 28,
      };
    }

    const gap = 8;
    const cardWidth = (this.layout.order.width - 22 - gap) / 2;
    const rect: RectSpec = {
      x: this.layout.order.x + 7 + index * (cardWidth + gap),
      y: this.layout.order.y + 27,
      width: cardWidth,
      height: this.layout.order.height - 34,
    };
    this.add.rectangle(
      rect.x + rect.width / 2,
      rect.y + rect.height / 2,
      rect.width,
      rect.height,
      index === 0 ? 0x59301e : 0x4d2a22,
      0.96,
    ).setStrokeStyle(1.5, index === 0 ? 0xf59e0b : 0xf0a35a, 0.75);
    this.add.text(rect.x + 9, rect.y + 9, index === 0 ? "😋 A" : "🤤 B", {
      fontFamily: "inherit",
      fontSize: "11px",
      fontStyle: "bold",
      color: "#fed7aa",
    }).setOrigin(0, 0.5);
    const recipeText = this.add.text(rect.x + rect.width / 2, rect.y + 36, "", {
      fontFamily: "inherit",
      fontSize: "18px",
      color: "#ffffff",
      align: "center",
    }).setOrigin(0.5);
    const barWidth = rect.width - 16;
    this.add.rectangle(rect.x + rect.width / 2, rect.y + rect.height - 9, barWidth, 6, 0x17202a);
    const patienceFill = this.add.rectangle(
      rect.x + 8,
      rect.y + rect.height - 9,
      barWidth,
      6,
      0x60a5fa,
    ).setOrigin(0, 0.5);
    const patienceText = this.add.text(rect.x + rect.width - 7, rect.y + 10, "", {
      fontFamily: "inherit",
      fontSize: "9px",
      color: "#bfdbfe",
    }).setOrigin(1, 0.5);
    return { rect, recipeText, patienceFill, patienceText, barWidth };
  }

  private updateOrderView(index: number): void {
    const order = this.orders[index];
    const view = this.orderViews[index];
    if (!order || !view) return;
    view.recipeText.setText(
      this.level.simultaneousOrders === 1
        ? order.recipe.map((kind) => `${FOOD[kind].shortLabel} ${FOOD[kind].label}`).join("   ")
        : order.recipe.map((kind) => FOOD[kind].shortLabel).join("  "),
    );
  }

  private spawnIngredientWave(): void {
    const rack = buildIngredientRack(this.layout.prep, this.layout.skewerStart.y, this.level.ingredientKinds);
    for (const slot of rack) {
      this.spawnIngredient(slot.kind, slot.x, slot.y);
    }
  }

  private spawnIngredient(kind: IngredientKind, x: number, y: number): MovingIngredient {
    const isOrderTarget = this.orders.some((order) => order.recipe.includes(kind));
    const body = this.add.rectangle(0, 0, 42, 36, FOOD[kind].color, 1).setStrokeStyle(
      isOrderTarget ? 3 : 1.5,
      isOrderTarget ? 0xfde68a : 0xffffff,
      isOrderTarget ? 0.95 : 0.2,
    );
    const label = this.add.text(0, 0, FOOD[kind].shortLabel, {
      fontFamily: "inherit",
      fontSize: "21px",
      fontStyle: "bold",
      color: "#ffffff",
    }).setOrigin(0.5);
    const touchWidth = this.level.ingredientKinds.length >= 6 ? 54 : 58;
    const view = this.add.container(x, y, [body, label]).setDepth(20).setSize(touchWidth, 52);
    const ingredient: MovingIngredient = {
      kind,
      view,
      body,
      homeX: x,
      homeY: y,
      phase: this.movingIngredients.length * 0.83 + this.levelId,
      direction: y < this.layout.prep.y + 100 ? 1 : -1,
    };
    view.setInteractive({ useHandCursor: true });
    view.on("pointerdown", () => this.pickIngredient(ingredient));
    this.movingIngredients.push(ingredient);
    return ingredient;
  }

  private pickIngredient(ingredient: MovingIngredient): void {
    const skewer = this.prepSkewer;
    if (this.ended || !this.started || this.manualPaused || this.clockPaused || !skewer || skewer.location !== "prep") return;
    if (this.activePointer?.skewer === skewer) return;

    const reservedSlot = skewer.pieces.length + this.pendingIngredientPickups;
    if (reservedSlot >= MAX_SKEWER_PIECES) {
      this.showToast("这根签子已经满了", 0xfed7aa);
      return;
    }

    ingredient.view.disableInteractive();
    this.movingIngredients = this.movingIngredients.filter((item) => item !== ingredient);
    const restockX = ingredient.homeX;
    const restockY = ingredient.homeY;
    this.pendingIngredientPickups += 1;
    const targetX = skewer.view.x - 43 + reservedSlot * 39;
    const targetY = skewer.view.y - 5;

    this.tweens.add({
      targets: ingredient.view,
      x: targetX,
      y: targetY,
      scaleX: 0.78,
      scaleY: 0.78,
      duration: 180,
      ease: "Cubic.easeIn",
      onComplete: () => {
        this.pendingIngredientPickups = Math.max(0, this.pendingIngredientPickups - 1);
        ingredient.view.destroy();
        if (!this.ended) this.spawnIngredient(ingredient.kind, restockX, restockY);
        if (this.ended || this.prepSkewer !== skewer || skewer.location !== "prep") return;

        skewer.pieces.push({ kind: ingredient.kind, sides: [0, 0] });
        this.buildSkewerVisual(skewer);
        this.feedback.play("pickup");
        this.feedback.vibrate(12);
        this.cameras.main.shake(45, 0.002);
        this.showToast(
          `${FOOD[ingredient.kind].label}自动上签 · ${skewer.pieces.length}/${MAX_SKEWER_PIECES}`,
          0xbbf7d0,
        );
        if (this.orders[0] && recipeMatches(skewer.pieces.map(({ kind }) => kind), this.orders[0].recipe)) {
          this.advanceTutorialStep("recipe-complete");
        }
      },
    });
  }

  private refreshIngredientTargets(): void {
    for (const ingredient of this.movingIngredients) {
      const isTarget = this.orders.some((order) => order.recipe.includes(ingredient.kind));
      ingredient.body.setStrokeStyle(
        isTarget ? 3 : 1.5,
        isTarget ? 0xfde68a : 0xffffff,
        isTarget ? 0.95 : 0.2,
      );
    }
  }

  private updateIngredientMotion(timeSeconds: number): void {
    const amplitude = this.level.ingredientMotionAmplitude;
    const speed = this.level.ingredientSpeed;
    if (amplitude <= 0 && speed <= 0) return;
    for (const ingredient of this.movingIngredients) {
      const position = ingredientPositionAt({
        homeX: ingredient.homeX,
        homeY: ingredient.homeY,
        phase: ingredient.phase,
        direction: ingredient.direction,
        timeSeconds,
        speed,
        swayAmplitude: amplitude,
        minX: this.layout.prep.x + (this.level.ingredientKinds.length >= 6 ? 24 : 28),
        maxX: this.layout.prep.x + this.layout.prep.width - (this.level.ingredientKinds.length >= 6 ? 24 : 28),
      });
      ingredient.view.setPosition(position.x, position.y);
    }
  }

  private createPrepSkewer(): void {
    if (this.prepSkewer) return;
    const skewer = this.createSkewer(this.layout.skewerStart.x, this.layout.skewerStart.y, "prep");
    this.prepSkewer = skewer;
  }

  private createSkewer(x: number, y: number, location: SkewerLocation): SkewerState {
    const view = this.add.container(x, y).setDepth(80).setSize(
      SKEWER_INTERACTION.width,
      SKEWER_INTERACTION.height,
    );
    const skewer: SkewerState = {
      id: this.nextSkewerId,
      view,
      pieces: [],
      pieceViews: [],
      location,
      downSide: 0,
      grillSlot: null,
      lastVisualBand: "",
    };
    this.nextSkewerId += 1;
    this.allSkewers.add(skewer);
    this.buildSkewerVisual(skewer);
    this.feedback.play("place");
    view.setInteractive({ useHandCursor: true });
    view.on("pointerdown", (pointer: Phaser.Input.Pointer) => this.beginPointer(skewer, pointer));
    return skewer;
  }

  private buildSkewerVisual(skewer: SkewerState): void {
    skewer.view.removeAll(true);
    skewer.pieceViews = [];

    const stick = this.add.graphics();
    stick.lineStyle(5, 0xd6b27b, 1).lineBetween(-80, 0, 88, 0);
    stick.fillStyle(0x8b5e3c, 1).fillRoundedRect(-96, -9, 24, 18, 6);
    stick.fillStyle(0xf5deb3, 1).fillTriangle(88, -4, 98, 0, 88, 4);
    skewer.view.add(stick);

    skewer.pieces.forEach((piece, index) => {
      const x = -43 + index * 39;
      const body = this.add.rectangle(x, -5, 34, 31, FOOD[piece.kind].color, 1).setStrokeStyle(2, 0xffffff, 0.4);
      const label = this.add.text(x, -6, FOOD[piece.kind].shortLabel, {
        fontFamily: "inherit",
        fontSize: "17px",
        fontStyle: "bold",
        color: "#ffffff",
      }).setOrigin(0.5);
      const sideA = this.add.rectangle(x - 15, 17, 30, 4, 0x60a5fa).setOrigin(0, 0.5);
      const sideB = this.add.rectangle(x - 15, 24, 30, 4, 0xfb923c).setOrigin(0, 0.5);
      skewer.view.add([body, label, sideA, sideB]);
      skewer.pieceViews.push({ body, label, sideA, sideB });
    });

    const sideLabel = this.add.text(-91, 19, `↓${skewer.downSide === 0 ? "蓝" : "橙"}`, {
      fontFamily: "inherit",
      fontSize: "8px",
      color: "#e7e5e4",
    });
    skewer.view.add(sideLabel);
    this.refreshSkewerVisual(skewer);
  }

  private refreshSkewerVisual(skewer: SkewerState): void {
    skewer.pieces.forEach((piece, index) => {
      const view = skewer.pieceViews[index];
      if (!view) return;
      const visibleSide = skewer.location === "grill" ? (1 - skewer.downSide) as 0 | 1 : 0;
      view.body.setFillStyle(this.colorForProgress(piece.kind, piece.sides[visibleSide]));
      view.sideA.displayWidth = 30 * Phaser.Math.Clamp(piece.sides[0] / 125, 0.03, 1);
      view.sideB.displayWidth = 30 * Phaser.Math.Clamp(piece.sides[1] / 125, 0.03, 1);
      view.sideA.setFillStyle(this.progressBarColor(piece.sides[0], 0x60a5fa));
      view.sideB.setFillStyle(this.progressBarColor(piece.sides[1], 0xfb923c));
      view.label.setAlpha(piece.sides.some((value) => value >= 125) ? 0.55 : 1);
    });
  }

  private progressBarColor(progress: number, sideColor: number): number {
    if (progress >= LEVEL_ONE_DONENESS.burntMin) return 0x292524;
    if (progress > LEVEL_ONE_DONENESS.perfectMax) return 0xef4444;
    if (isPerfectDoneness(progress)) return 0xfacc15;
    return sideColor;
  }

  private colorForProgress(kind: IngredientKind, progress: number): number {
    if (progress >= 125) return FOOD[kind].burntColor;
    if (progress >= 70) return FOOD[kind].cookedColor;
    if (progress >= 40) return Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.ValueToColor(FOOD[kind].color),
      Phaser.Display.Color.ValueToColor(FOOD[kind].cookedColor),
      100,
      45,
    ).color;
    return FOOD[kind].color;
  }

  private bindInput(): void {
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => this.movePointer(pointer));
    this.input.on("pointerup", () => this.endPointer());
  }

  private beginPointer(skewer: SkewerState, pointer: Phaser.Input.Pointer): void {
    if (this.ended || !this.started || this.manualPaused || this.clockPaused || this.activePointer) return;
    if (skewer === this.prepSkewer && this.pendingIngredientPickups > 0) {
      this.showToast("食材正在自动上签", 0xfef3c7);
      return;
    }
    this.activePointer = {
      skewer,
      startX: pointer.x,
      startY: pointer.y,
      originX: skewer.view.x,
      originY: skewer.view.y,
      grabOffsetX: skewer.view.x - pointer.x,
      grabOffsetY: skewer.view.y - pointer.y,
      source: skewer.location,
      sourceSlot: skewer.grillSlot,
      dragging: false,
      trashHoverStarted: null,
      trashCleared: false,
    };
    skewer.view.setDepth(250);
  }

  private movePointer(pointer: Phaser.Input.Pointer): void {
    const active = this.activePointer;
    if (!active || this.ended || this.manualPaused || this.clockPaused) return;
    const distance = Phaser.Math.Distance.Between(active.startX, active.startY, pointer.x, pointer.y);
    if (!active.dragging && distance > SKEWER_INTERACTION.dragThreshold) {
      active.dragging = true;
      this.detachFromLocation(active.skewer);
      active.skewer.location = "dragging";
    }
    if (!active.dragging) return;

    active.skewer.view.setPosition(pointer.x + active.grabOffsetX, pointer.y + active.grabOffsetY);
    if (this.contains(this.layout.trash, active.skewer.view.x, active.skewer.view.y)) {
      active.trashHoverStarted ??= this.time.now;
    } else {
      active.trashHoverStarted = null;
      active.trashCleared = false;
    }
  }

  private endPointer(): void {
    const active = this.activePointer;
    if (!active) return;
    if (this.manualPaused || this.clockPaused) {
      this.cancelActivePointer();
      return;
    }
    this.activePointer = null;
    const dropX = active.skewer.view.x;
    const dropY = active.skewer.view.y;

    if (!active.dragging) {
      active.skewer.view.setDepth(80);
      if (active.source === "grill") this.flipSkewer(active.skewer);
      return;
    }

    if (active.trashCleared) {
      this.finishDiscard(active.skewer, active.source);
      return;
    }

    if (this.contains(this.layout.trash, dropX, dropY)) {
      if (discardActionForSkewer(active.source, false) === "remove-last-piece") {
        this.removeLastPiece(active.skewer);
        this.restoreDraggedSkewer(active);
      } else {
        this.finishDiscard(active.skewer, active.source);
      }
      return;
    }

    const matchingOrderIndex = this.contains(this.layout.order, dropX, dropY)
      ? findMatchingOrderIndex(
        active.skewer.pieces.map(({ kind }) => kind),
        this.orders.map(({ recipe }) => recipe),
      )
      : null;
    const orderIndex = matchingOrderIndex ?? this.orderIndexAt(dropX, dropY);
    if (orderIndex !== null && active.skewer.pieces.length > 0) {
      if (this.tryServe(active.skewer, orderIndex)) return;
      this.restoreDraggedSkewer(active);
      return;
    }

    const grillDropRadius = this.level.grillSlots === 3 ? 48 : 68;
    const grillSlot = this.grillPositions.findIndex(({ x, y }, index) =>
      this.grillSlots[index] === null && Phaser.Math.Distance.Between(x, y, dropX, dropY) < grillDropRadius,
    );
    if (grillSlot >= 0 && active.skewer.pieces.length > 0) {
      this.placeOnGrill(active.skewer, grillSlot);
      this.ensurePrepSkewer(active.skewer);
      return;
    }

    const isRaw = active.skewer.pieces.every((piece) => piece.sides[0] === 0 && piece.sides[1] === 0);
    if (this.contains(this.layout.tray, dropX, dropY) && this.traySkewer === null && isRaw && active.skewer.pieces.length > 0) {
      this.placeOnTray(active.skewer);
      this.ensurePrepSkewer(active.skewer);
      return;
    }

    this.restoreDraggedSkewer(active);
  }

  private detachFromLocation(skewer: SkewerState): void {
    if (skewer.location === "grill" && skewer.grillSlot !== null) {
      this.grillSlots[skewer.grillSlot] = null;
      skewer.grillSlot = null;
    }
    if (skewer.location === "tray" && this.traySkewer === skewer) {
      this.traySkewer = null;
    }
  }

  private restoreDraggedSkewer(active: ActivePointer): void {
    const skewer = active.skewer;
    skewer.view.setPosition(active.originX, active.originY).setDepth(80);
    skewer.location = active.source;
    if (active.source === "grill" && active.sourceSlot !== null) {
      skewer.grillSlot = active.sourceSlot;
      this.grillSlots[active.sourceSlot] = skewer;
    }
    if (active.source === "tray") this.traySkewer = skewer;
    this.refreshSkewerVisual(skewer);
  }

  private cancelActivePointer(): void {
    const active = this.activePointer;
    if (!active) return;
    this.activePointer = null;
    if (active.dragging) this.restoreDraggedSkewer(active);
    else active.skewer.view.setDepth(80);
  }

  private removeLastPiece(skewer: SkewerState): void {
    const removed = skewer.pieces.pop();
    if (!removed) return;
    this.buildSkewerVisual(skewer);
    this.showToast(`撤下${FOOD[removed.kind].label}`, 0xfecaca);
  }

  private updateTrashHold(): void {
    const active = this.activePointer;
    if (!active?.dragging || active.source !== "prep" || active.trashHoverStarted === null || active.trashCleared) return;
    if (this.time.now - active.trashHoverStarted < 600) return;
    active.trashCleared = true;
    this.showToast("松手清空整串", 0xfca5a5);
  }

  private finishDiscard(skewer: SkewerState, source: SkewerLocation): void {
    if (source === "prep") {
      skewer.location = "prep";
      skewer.view.setPosition(this.layout.skewerStart.x, this.layout.skewerStart.y).setDepth(80);
      return;
    }
    this.destroySkewer(skewer);
    this.ensurePrepSkewer(skewer);
  }

  private placeOnGrill(skewer: SkewerState, slot: number): void {
    const position = this.grillPositions[slot];
    skewer.location = "grill";
    skewer.grillSlot = slot;
    skewer.view.setPosition(position.x, position.y).setDepth(80);
    skewer.view.setSize(SKEWER_INTERACTION.width, this.level.grillSlots === 3 ? 64 : SKEWER_INTERACTION.height);
    this.grillSlots[slot] = skewer;
    this.buildSkewerVisual(skewer);
    this.showToast(`进入烤位 ${slot + 1} · 点击翻面`, 0xfed7aa);
    this.advanceTutorialStep("placed-on-grill");
  }

  private placeOnTray(skewer: SkewerState): void {
    skewer.location = "tray";
    skewer.grillSlot = null;
    skewer.view.setPosition(
      this.layout.tray.x + this.layout.tray.width / 2,
      this.layout.tray.y + this.layout.tray.height / 2 + 8,
    ).setDepth(80);
    skewer.view.setSize(SKEWER_INTERACTION.width, SKEWER_INTERACTION.height);
    this.traySkewer = skewer;
    this.refreshSkewerVisual(skewer);
    this.showToast("已放入待烤托盘", 0xe7e5e4);
  }

  private ensurePrepSkewer(movedSkewer: SkewerState): void {
    if (this.prepSkewer === movedSkewer) this.prepSkewer = null;
    this.createPrepSkewer();
  }

  private flipSkewer(skewer: SkewerState): void {
    skewer.downSide = skewer.downSide === 0 ? 1 : 0;
    this.buildSkewerVisual(skewer);
    this.cameras.main.shake(35, 0.0015);
    this.feedback.play("flip");
    this.feedback.vibrate(14);
    this.showToast(`翻面 · 现在烤${skewer.downSide === 0 ? "蓝" : "橙"}面`, 0xbfdbfe);
    if (this.tutorialStep === "flip") {
      this.tutorialPaused = false;
      this.advanceTutorialStep("flipped");
    }
  }

  private updateCooking(seconds: number): void {
    for (const skewer of this.grillSlots) {
      if (!skewer) continue;
      let band = "";
      for (const piece of skewer.pieces) {
        const rate = 70 / FOOD[piece.kind].cookSeconds;
        piece.sides[skewer.downSide] += rate * seconds;
        const value = piece.sides[skewer.downSide];
        band += value >= LEVEL_ONE_DONENESS.burntMin
          ? "B"
          : isPerfectDoneness(value)
            ? "P"
            : value >= 40
              ? "W"
              : "R";
      }
      if (band !== skewer.lastVisualBand) {
        skewer.lastVisualBand = band;
        if (band.includes("B")) {
          this.showToast("焦糊警告！快拿开", 0xfca5a5);
          this.feedback.play("warning");
        }
        else if (band.length > 0 && [...band].every((value) => value === "P")) this.showToast("这一面火候正好，可以翻面", 0xfef08a);
      }
      this.refreshSkewerVisual(skewer);
      if (this.tutorialActive && this.tutorialStep === "cook-first-side") {
        const firstSideReady = skewer.pieces.length > 0
          && skewer.pieces.every((piece) => isPerfectDoneness(piece.sides[skewer.downSide]));
        if (firstSideReady) {
          this.advanceTutorialStep("first-side-ready");
          this.tutorialPaused = true;
        }
      } else if (this.tutorialActive && this.tutorialStep === "cook-second-side") {
        const bothSidesReady = skewer.pieces.length > 0
          && skewer.pieces.every((piece) => piece.sides.every(isPerfectDoneness));
        if (bothSidesReady) {
          this.advanceTutorialStep("both-sides-ready");
          this.tutorialPaused = true;
        }
      }
    }
  }

  private tryServe(skewer: SkewerState, orderIndex: number): boolean {
    const order = this.orders[orderIndex];
    if (!order) return false;
    const result = evaluateService({
      expectedRecipe: order.recipe,
      pieces: skewer.pieces,
      patienceRatio: order.patience / order.maxPatience,
      comboBefore: this.combo,
    });
    if (!result.accepted) {
      this.score = Math.max(0, this.score - result.scorePenalty);
      this.combo = result.comboAfter;
      order.patience = Math.max(0, order.patience - order.maxPatience * 0.2);
      this.showToast(
        result.reason === "wrong-recipe" ? "配方不对 · 顾客拒收  -50" : "还有生面 · 顾客拒收  -50",
        0xfca5a5,
      );
      return false;
    }

    const finishingTutorial = this.tutorialActive && this.tutorialStep === "serve";
    this.combo = result.comboAfter;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.score += result.earnedScore;
    this.completedOrders += 1;
    if (result.perfect) this.perfectOrders += 1;
    this.showToast(
      `${result.perfect ? "完美出餐" : "出餐成功"}  +${result.earnedScore}`,
      result.perfect ? 0xfef08a : 0xbbf7d0,
    );
    this.feedback.play(result.perfect ? "perfect" : "success");
    if (result.perfect) this.feedback.vibrate(24);
    if (!this.oneStarAnnounced && this.score >= this.level.starScores[0]) {
      this.oneStarAnnounced = true;
      this.celebrateGoalReached();
    }
    this.destroySkewer(skewer);
    this.ensurePrepSkewer(skewer);
    this.createOrder(orderIndex);
    this.updateHud();
    if (finishingTutorial) {
      this.advanceTutorialStep("served");
      this.showTutorialScore(result.earnedScore);
    }
    return true;
  }

  private destroySkewer(skewer: SkewerState): void {
    this.detachFromLocation(skewer);
    if (this.prepSkewer === skewer) this.prepSkewer = null;
    this.allSkewers.delete(skewer);
    skewer.view.destroy(true);
  }

  private updateHud(): void {
    this.scoreText.setText(`积分 ${this.score}`);
    this.timerText.setText(`${this.timeRemaining.toFixed(1)}s`);
    this.timerText.setColor(this.timeRemaining <= 10 ? "#fca5a5" : "#ffffff");
    this.comboText.setText(`连击 ${this.combo} · ×${Math.min(1.5, 1 + this.combo * 0.1).toFixed(1)}`);
    const stars = starsForScore(this.score, this.level);
    const nextTarget = stars === 3 ? this.level.starScores[2] : this.level.starScores[stars];
    this.goalText.setText(stars === 3 ? "★★★ 满星" : `${"★".repeat(stars)} ${this.score}/${nextTarget}`);
    this.orders.forEach((order, index) => {
      const view = this.orderViews[index];
      if (!view) return;
      const ratio = Phaser.Math.Clamp(order.patience / order.maxPatience, 0, 1);
      view.patienceText.setText(`${this.level.simultaneousOrders === 1 ? "耐心 " : ""}${Math.ceil(order.patience)}s`);
      view.patienceFill.displayWidth = view.barWidth * ratio;
      view.patienceFill.setFillStyle(ratio < 0.25 ? 0xef4444 : ratio < 0.55 ? 0xf59e0b : 0x60a5fa);
    });
  }

  private celebrateGoalReached(): void {
    this.feedback.play("goal");
    this.feedback.vibrate(35);
    const banner = this.add.container(WORLD_WIDTH / 2, 148).setDepth(580);
    const background = this.add.rectangle(0, 0, 300, 78, 0x7c2d12, 0.97).setStrokeStyle(3, 0xfacc15, 1);
    const title = this.add.text(0, -12, "★ 过关目标达成！", {
      fontFamily: "inherit",
      fontSize: "22px",
      fontStyle: "bold",
      color: "#fef08a",
    }).setOrigin(0.5);
    const subtitle = this.add.text(0, 19, "继续营业，冲击三星", {
      fontFamily: "inherit",
      fontSize: "12px",
      color: "#ffedd5",
    }).setOrigin(0.5);
    banner.add([background, title, subtitle]).setScale(0.72).setAlpha(0);
    this.tweens.add({
      targets: banner,
      scale: 1,
      alpha: 1,
      duration: 240,
      ease: "Back.Out",
      hold: 1300,
      yoyo: true,
      onComplete: () => banner.destroy(true),
    });
    this.cameras.main.flash(220, 255, 224, 120, false);
  }

  private showToast(message: string, color: number): void {
    if (!this.toastText) return;
    this.tweens.killTweensOf(this.toastText);
    this.toastText.setText(message).setColor(Phaser.Display.Color.IntegerToColor(color).rgba).setAlpha(1);
    this.tweens.add({
      targets: this.toastText,
      alpha: 0,
      delay: 1050,
      duration: 240,
    });
  }

  private finishRound(): void {
    this.ended = true;
    this.activePointer = null;
    this.tutorialPaused = false;
    this.tutorialText.setVisible(false);
    this.tutorialGlow.setVisible(false);
    const stars = starsForScore(this.score, this.level);
    const passed = stars >= 1;
    const progress = this.storage
      ? this.levelId === 1
        ? recordLevelOneResult(this.storage, {
          score: this.score,
          stars,
          tutorialCompleted: !this.tutorialActive || this.tutorialStep === "complete",
        })
        : recordLevelResult(this.storage, this.levelId, { score: this.score, stars })
      : undefined;
    const veil = this.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, 0x0c0a09, 0.86).setDepth(500);
    const card = this.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2 - 4, 334, 440, 0x3d2418, 1)
      .setStrokeStyle(2, 0xf59e0b, 0.8)
      .setDepth(501);
    const title = this.add.text(WORLD_WIDTH / 2, WORLD_HEIGHT / 2 - 182, passed ? "营业成功！" : "差一点就过关", {
      fontFamily: "inherit",
      fontSize: "28px",
      fontStyle: "bold",
      color: passed ? "#fef08a" : "#fff7ed",
    }).setOrigin(0.5).setDepth(502);
    const starText = this.add.text(WORLD_WIDTH / 2, WORLD_HEIGHT / 2 - 132, `${"★".repeat(stars)}${"☆".repeat(3 - stars)}`, {
      fontFamily: "inherit",
      fontSize: "40px",
      color: stars > 0 ? "#facc15" : "#a8a29e",
      letterSpacing: 7,
    }).setOrigin(0.5).setDepth(502);
    const stats = this.add.text(
      WORLD_WIDTH / 2,
      WORLD_HEIGHT / 2 - 36,
      `本局积分  ${this.score}\n历史最高  ${progress ? this.bestScoreFor(progress) : this.score}\n完成订单  ${this.completedOrders}\n完美出餐  ${this.perfectOrders}\n最高连击  ${this.maxCombo}`,
      {
        fontFamily: "inherit",
        fontSize: "16px",
        color: "#e7e5e4",
        align: "center",
        lineSpacing: 9,
      },
    ).setOrigin(0.5).setDepth(502);
    const status = this.add.text(
      WORLD_WIDTH / 2,
      WORLD_HEIGHT / 2 + 87,
      passed
        ? this.levelId < 6 ? `第 ${this.levelId + 1} 关已解锁` : "六关全通关 · 继续冲击三星！"
        : `再得 ${this.level.starScores[0] - this.score} 分即可过关`,
      {
        fontFamily: "inherit",
        fontSize: "12px",
        color: passed ? "#bbf7d0" : "#fed7aa",
      },
    ).setOrigin(0.5).setDepth(502);
    const replay = this.add.text(WORLD_WIDTH / 2, WORLD_HEIGHT / 2 + 137, `重试第 ${this.levelId} 关`, {
      fontFamily: "inherit",
      fontSize: "18px",
      fontStyle: "bold",
      color: "#1c1917",
      backgroundColor: "#fbbf24",
      padding: { left: 34, right: 34, top: 12, bottom: 12 },
    }).setOrigin(0.5).setDepth(502).setInteractive({ useHandCursor: true });
    replay.on("pointerdown", () => this.scene.restart({ levelId: this.levelId }));
    const secondaryLabel = passed && this.levelId < 6 ? `进入第 ${this.levelId + 1} 关` : "返回选关";
    const secondary = this.add.text(WORLD_WIDTH / 2, WORLD_HEIGHT / 2 + 198, secondaryLabel, {
      fontFamily: "inherit",
      fontSize: "15px",
      color: "#fed7aa",
      padding: { left: 30, right: 30, top: 8, bottom: 8 },
    }).setOrigin(0.5).setDepth(502).setInteractive({ useHandCursor: true });
    secondary.on("pointerdown", () => {
      if (passed && this.levelId < 6) this.scene.restart({ levelId: this.levelId + 1 });
      else this.scene.start("LevelSelect");
    });
    void veil;
    void card;
    void title;
    void starText;
    void stats;
    void status;
  }

  private contains(rect: RectSpec, x: number, y: number): boolean {
    return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
  }

  private orderIndexAt(x: number, y: number): number | null {
    const index = this.orderViews.findIndex(({ rect }) => this.contains(rect, x, y));
    return index >= 0 ? index : null;
  }

  private bestScoreFor(progress: GameProgress): number {
    if (this.levelId === 1) return progress.levelOneBestScore;
    if (this.levelId === 2) return progress.levelTwoBestScore;
    if (this.levelId === 3) return progress.levelThreeBestScore;
    if (this.levelId === 4) return progress.levelFourBestScore;
    if (this.levelId === 5) return progress.levelFiveBestScore;
    return progress.levelSixBestScore;
  }

  private bestStarsFor(progress: GameProgress): number {
    if (this.levelId === 1) return progress.levelOneBestStars;
    if (this.levelId === 2) return progress.levelTwoBestStars;
    if (this.levelId === 3) return progress.levelThreeBestStars;
    if (this.levelId === 4) return progress.levelFourBestStars;
    if (this.levelId === 5) return progress.levelFiveBestStars;
    return progress.levelSixBestStars;
  }

  private pauseClock(): void {
    this.clockPaused = true;
  }

  private resumeClock(): void {
    this.clockPaused = false;
  }
}
