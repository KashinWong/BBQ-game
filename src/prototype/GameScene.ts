import Phaser from "phaser";
import { calculateOrderPatienceSeconds } from "./orderTiming";
import { buildIngredientLaneYs } from "./prepLayout";

type IngredientKind = "beef" | "pepper" | "mushroom";
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
  grillSlots: Array<{ x: number; y: number }>;
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
  direction: -1 | 1;
  speed: number;
}

interface OrderState {
  recipe: IngredientKind[];
  patience: number;
  maxPatience: number;
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
const ROUND_SECONDS = 90;
const MAX_SKEWER_PIECES = 4;

const FOOD: Record<IngredientKind, FoodDefinition> = {
  beef: {
    label: "牛肉",
    shortLabel: "牛",
    color: 0xb85c5c,
    cookedColor: 0x8a4a2f,
    burntColor: 0x292524,
    cookSeconds: 5,
  },
  pepper: {
    label: "青椒",
    shortLabel: "椒",
    color: 0x4d9b56,
    cookedColor: 0x7b9239,
    burntColor: 0x303725,
    cookSeconds: 3.5,
  },
  mushroom: {
    label: "蘑菇",
    shortLabel: "菇",
    color: 0xd6c1a5,
    cookedColor: 0xa7835e,
    burntColor: 0x39302a,
    cookSeconds: 4,
  },
};

const LAYOUT: LayoutSpec = {
  name: "上下工作台",
  order: { x: 15, y: 76, width: 360, height: 116 },
  grill: { x: 15, y: 202, width: 360, height: 250 },
  tray: { x: 15, y: 462, width: 174, height: 68 },
  trash: { x: 201, y: 462, width: 174, height: 68 },
  prep: { x: 15, y: 540, width: 360, height: 245 },
  grillSlots: [
    { x: 195, y: 284 },
    { x: 195, y: 390 },
  ],
  skewerStart: { x: 112, y: 748 },
};

const RECIPES: IngredientKind[][] = [
  ["beef", "pepper"],
  ["mushroom", "beef"],
  ["pepper", "mushroom", "beef"],
  ["beef", "beef", "pepper"],
  ["mushroom", "mushroom", "beef"],
];

export class GameScene extends Phaser.Scene {
  private readonly layout = LAYOUT;

  private movingIngredients: MovingIngredient[] = [];
  private allSkewers = new Set<SkewerState>();
  private grillSlots: Array<SkewerState | null> = [null, null];
  private traySkewer: SkewerState | null = null;
  private prepSkewer: SkewerState | null = null;
  private activePointer: ActivePointer | null = null;

  private score = 0;
  private combo = 0;
  private timeRemaining = ROUND_SECONDS;
  private completedOrders = 0;
  private perfectOrders = 0;
  private nextSkewerId = 1;
  private nextRecipeIndex = 0;
  private spawnCounter = 0;
  private pendingIngredientPickups = 0;
  private ended = false;
  private clockPaused = false;

  private order!: OrderState;
  private scoreText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private orderRecipeText?: Phaser.GameObjects.Text;
  private patienceFill?: Phaser.GameObjects.Rectangle;
  private patienceText?: Phaser.GameObjects.Text;
  private toastText!: Phaser.GameObjects.Text;
  private stateText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: "GrayboxGame" });
  }

  create(): void {
    this.resetRuntimeState();
    this.drawLayout();
    this.createHud();
    this.createOrder();
    this.spawnIngredientWave();
    this.createPrepSkewer();
    this.bindInput();
    this.updateHud();
    this.showToast("点击订单食材，它会自动飞到签子上", 0xfef3c7);

    this.game.events.on(Phaser.Core.Events.BLUR, this.pauseClock, this);
    this.game.events.on(Phaser.Core.Events.FOCUS, this.resumeClock, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(Phaser.Core.Events.BLUR, this.pauseClock, this);
      this.game.events.off(Phaser.Core.Events.FOCUS, this.resumeClock, this);
    });
  }

  update(_time: number, delta: number): void {
    if (this.ended || this.clockPaused) return;

    const seconds = Math.min(delta, 100) / 1000;
    this.timeRemaining = Math.max(0, this.timeRemaining - seconds);
    this.order.patience = Math.max(0, this.order.patience - seconds);
    this.updateMovingIngredients(seconds);
    this.updateCooking(seconds);
    this.updateTrashHold();

    if (this.order.patience <= 0) {
      this.score = Math.max(0, this.score - 30);
      this.combo = 0;
      this.showToast("订单超时  -30", 0xfca5a5);
      this.createOrder();
    }

    if (this.timeRemaining <= 0) {
      this.finishRound();
      return;
    }

    this.updateHud();
    this.updateStateReadout();
  }

  private resetRuntimeState(): void {
    this.movingIngredients = [];
    this.allSkewers = new Set<SkewerState>();
    this.grillSlots = [null, null];
    this.traySkewer = null;
    this.prepSkewer = null;
    this.activePointer = null;
    this.score = 0;
    this.combo = 0;
    this.timeRemaining = ROUND_SECONDS;
    this.completedOrders = 0;
    this.perfectOrders = 0;
    this.nextSkewerId = 1;
    this.nextRecipeIndex = 0;
    this.spawnCounter = 0;
    this.pendingIngredientPickups = 0;
    this.ended = false;
    this.clockPaused = false;
    this.orderRecipeText = undefined;
    this.patienceFill = undefined;
    this.patienceText = undefined;
  }

  private drawLayout(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x171412, 1).fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    graphics.fillStyle(0x29221e, 1).fillRoundedRect(8, 8, 374, 58, 16);

    this.drawPanel(graphics, this.layout.order, 0x263441, 0x54738e);
    this.drawPanel(graphics, this.layout.grill, 0x2d2927, 0x5f554f);
    this.drawPanel(graphics, this.layout.prep, 0x243129, 0x4e6c58);
    this.drawPanel(graphics, this.layout.tray, 0x34302a, 0x6c6255);
    this.drawPanel(graphics, this.layout.trash, 0x35292a, 0x7f4b4e);

    graphics.lineStyle(3, 0x6b4b38, 1);
    for (let y = this.layout.grill.y + 30; y < this.layout.grill.y + this.layout.grill.height - 10; y += 18) {
      graphics.lineBetween(this.layout.grill.x + 12, y, this.layout.grill.x + this.layout.grill.width - 12, y);
    }

    this.layout.grillSlots.forEach(({ x, y }, index) => {
      graphics.fillStyle(0x171412, 0.6).fillRoundedRect(x - 95, y - 34, 190, 68, 14);
      graphics.lineStyle(2, 0xc17a4a, 0.55).strokeRoundedRect(x - 95, y - 34, 190, 68, 14);
      this.add.text(x, y, `烤位 ${index + 1}`, {
        fontFamily: "inherit",
        fontSize: "12px",
        color: "#9a8c82",
      }).setOrigin(0.5);
    });

    this.add.text(this.layout.order.x + 12, this.layout.order.y + 10, "顾客订单 · 把烤好的串拖到这里", {
      fontFamily: "inherit",
      fontSize: "12px",
      fontStyle: "bold",
      color: "#bfdbfe",
      lineSpacing: 2,
    });
    this.add.text(this.layout.grill.x + 12, this.layout.grill.y + 10, "炭火烤架 · 点击烤串翻面", {
      fontFamily: "inherit",
      fontSize: "12px",
      fontStyle: "bold",
      color: "#fdba74",
    });
    this.add.text(this.layout.prep.x + 12, this.layout.prep.y + 10, "点击食材 · 黄框是当前订单目标", {
      fontFamily: "inherit",
      fontSize: "12px",
      fontStyle: "bold",
      color: "#bbf7d0",
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
    this.add.text(20, 43, this.layout.name, {
      fontFamily: "inherit",
      fontSize: "10px",
      color: "#a8a29e",
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

    const restart = this.add.text(360, 31, "↻", {
      fontFamily: "inherit",
      fontSize: "24px",
      color: "#d6d3d1",
      backgroundColor: "#403936",
      padding: { left: 6, right: 6, top: 1, bottom: 1 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    restart.on("pointerdown", () => this.scene.restart());

    this.toastText = this.add.text(WORLD_WIDTH / 2, 68, "", {
      fontFamily: "inherit",
      fontSize: "13px",
      fontStyle: "bold",
      color: "#fff7ed",
      backgroundColor: "#171412",
      padding: { left: 10, right: 10, top: 5, bottom: 5 },
    }).setOrigin(0.5, 0).setDepth(300).setAlpha(0);

    this.stateText = this.add.text(8, WORLD_HEIGHT - 54, "", {
      fontFamily: "monospace",
      fontSize: "9px",
      color: "#a8a29e",
      backgroundColor: "#171412cc",
      padding: { left: 5, right: 5, top: 3, bottom: 3 },
    }).setDepth(200);
  }

  private createOrder(): void {
    const recipe = [...RECIPES[this.nextRecipeIndex % RECIPES.length]];
    this.nextRecipeIndex += 1;
    const patience = calculateOrderPatienceSeconds(recipe, FOOD);
    this.order = { recipe, patience, maxPatience: patience };

    if (!this.orderRecipeText) {
      const centerX = this.layout.order.x + this.layout.order.width / 2;
      const centerY = this.layout.order.y + this.layout.order.height / 2;
      this.orderRecipeText = this.add.text(centerX, centerY, "", {
        fontFamily: "inherit",
        fontSize: "20px",
        fontStyle: "bold",
        color: "#ffffff",
        align: "center",
        lineSpacing: 7,
        wordWrap: { width: this.layout.order.width - 24 },
      }).setOrigin(0.5);

      this.add.rectangle(
        this.layout.order.x + this.layout.order.width / 2,
        this.layout.order.y + this.layout.order.height - 14,
        this.layout.order.width - 28,
        8,
        0x17202a,
      );
      this.patienceFill = this.add.rectangle(
        this.layout.order.x + 14,
        this.layout.order.y + this.layout.order.height - 14,
        this.layout.order.width - 28,
        8,
        0x60a5fa,
      ).setOrigin(0, 0.5);
      this.patienceText = this.add.text(
        this.layout.order.x + this.layout.order.width - 14,
        this.layout.order.y + this.layout.order.height - 32,
        "",
        {
          fontFamily: "inherit",
          fontSize: "10px",
          color: "#bfdbfe",
        },
      ).setOrigin(1, 0.5);
    }

    this.orderRecipeText!.setText(recipe.map((kind) => `[ ${FOOD[kind].label} ]`).join("  "));
    this.refreshIngredientTargets();
  }

  private spawnIngredientWave(): void {
    const count = 8;
    for (let index = 0; index < count; index += 1) {
      const ingredient = this.spawnIngredient(index / count);
      ingredient.view.x = this.layout.prep.x + 28 + (this.layout.prep.width - 56) * (index / Math.max(1, count - 1));
    }
  }

  private spawnIngredient(initialProgress?: number): MovingIngredient {
    const kind = this.pickNextIngredientKind();
    const direction = this.spawnCounter % 2 === 0 ? 1 : -1;
    const laneCount = 3;
    const lane = this.spawnCounter % laneCount;
    this.spawnCounter += 1;

    const y = buildIngredientLaneYs(this.layout.prep.y, this.layout.prep.height, laneCount)[lane];
    const startX = initialProgress === undefined
      ? direction === 1
        ? this.layout.prep.x - 28
        : this.layout.prep.x + this.layout.prep.width + 28
      : this.layout.prep.x + 24 + (this.layout.prep.width - 48) * initialProgress;

    const isOrderTarget = this.order.recipe.includes(kind);
    const body = this.add.rectangle(0, 0, 42, 36, FOOD[kind].color, 1).setStrokeStyle(
      isOrderTarget ? 3 : 1.5,
      isOrderTarget ? 0xfde68a : 0xffffff,
      isOrderTarget ? 0.95 : 0.2,
    );
    const label = this.add.text(0, 0, FOOD[kind].shortLabel, {
      fontFamily: "inherit",
      fontSize: "15px",
      fontStyle: "bold",
      color: "#ffffff",
    }).setOrigin(0.5);
    const view = this.add.container(startX, y, [body, label]).setDepth(20).setSize(54, 48);
    const ingredient: MovingIngredient = {
      kind,
      view,
      body,
      direction,
      speed: 16 + (this.spawnCounter % 4) * 3,
    };
    view.setInteractive({ useHandCursor: true });
    view.on("pointerdown", () => this.pickIngredient(ingredient));
    this.movingIngredients.push(ingredient);
    return ingredient;
  }

  private pickIngredient(ingredient: MovingIngredient): void {
    const skewer = this.prepSkewer;
    if (this.ended || !skewer || skewer.location !== "prep") return;
    if (this.activePointer?.skewer === skewer) return;

    const reservedSlot = skewer.pieces.length + this.pendingIngredientPickups;
    if (reservedSlot >= MAX_SKEWER_PIECES) {
      this.showToast("这根签子已经满了", 0xfed7aa);
      return;
    }

    ingredient.view.disableInteractive();
    this.movingIngredients = this.movingIngredients.filter((item) => item !== ingredient);
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
        if (this.ended || this.prepSkewer !== skewer || skewer.location !== "prep") return;

        skewer.pieces.push({ kind: ingredient.kind, sides: [0, 0] });
        this.buildSkewerVisual(skewer);
        this.cameras.main.shake(45, 0.002);
        this.showToast(
          `${FOOD[ingredient.kind].label}自动上签 · ${skewer.pieces.length}/${MAX_SKEWER_PIECES}`,
          0xbbf7d0,
        );
        if (!this.ended) this.spawnIngredient();
      },
    });
  }

  private refreshIngredientTargets(): void {
    for (const ingredient of this.movingIngredients) {
      const isTarget = this.order.recipe.includes(ingredient.kind);
      ingredient.body.setStrokeStyle(
        isTarget ? 3 : 1.5,
        isTarget ? 0xfde68a : 0xffffff,
        isTarget ? 0.95 : 0.2,
      );
    }
  }

  private pickNextIngredientKind(): IngredientKind {
    if (this.spawnCounter % 3 !== 2) {
      return this.order.recipe[this.spawnCounter % this.order.recipe.length];
    }
    return (["beef", "pepper", "mushroom"] as IngredientKind[])[this.spawnCounter % 3];
  }

  private createPrepSkewer(): void {
    if (this.prepSkewer) return;
    const skewer = this.createSkewer(this.layout.skewerStart.x, this.layout.skewerStart.y, "prep");
    this.prepSkewer = skewer;
  }

  private createSkewer(x: number, y: number, location: SkewerLocation): SkewerState {
    const view = this.add.container(x, y).setDepth(80).setSize(196, 64);
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
    view.setInteractive(new Phaser.Geom.Rectangle(-98, -32, 196, 64), Phaser.Geom.Rectangle.Contains);
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
        fontSize: "13px",
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
      view.label.setAlpha(piece.sides.some((value) => value >= 125) ? 0.55 : 1);
    });
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
    if (this.ended || this.activePointer) return;
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
    if (!active || this.ended) return;
    const distance = Phaser.Math.Distance.Between(active.startX, active.startY, pointer.x, pointer.y);
    if (!active.dragging && distance > 8) {
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
    }
  }

  private endPointer(): void {
    const active = this.activePointer;
    if (!active) return;
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
      this.removeLastPiece(active.skewer);
      this.restoreDraggedSkewer(active);
      return;
    }

    if (this.contains(this.layout.order, dropX, dropY) && active.skewer.pieces.length > 0) {
      if (this.tryServe(active.skewer)) return;
      this.restoreDraggedSkewer(active);
      return;
    }

    const grillSlot = this.layout.grillSlots.findIndex(({ x, y }, index) =>
      this.grillSlots[index] === null && Phaser.Math.Distance.Between(x, y, dropX, dropY) < 68,
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

  private removeLastPiece(skewer: SkewerState): void {
    const removed = skewer.pieces.pop();
    if (!removed) return;
    this.buildSkewerVisual(skewer);
    this.showToast(`撤下${FOOD[removed.kind].label}`, 0xfecaca);
  }

  private updateTrashHold(): void {
    const active = this.activePointer;
    if (!active?.dragging || active.trashHoverStarted === null || active.trashCleared) return;
    if (this.time.now - active.trashHoverStarted < 600) return;
    active.trashCleared = true;
    active.skewer.pieces = [];
    this.buildSkewerVisual(active.skewer);
    this.showToast("整串已清空", 0xfca5a5);
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
    const position = this.layout.grillSlots[slot];
    skewer.location = "grill";
    skewer.grillSlot = slot;
    skewer.view.setPosition(position.x, position.y).setDepth(80);
    this.grillSlots[slot] = skewer;
    this.buildSkewerVisual(skewer);
    this.showToast(`进入烤位 ${slot + 1} · 点击翻面`, 0xfed7aa);
  }

  private placeOnTray(skewer: SkewerState): void {
    skewer.location = "tray";
    skewer.grillSlot = null;
    skewer.view.setPosition(
      this.layout.tray.x + this.layout.tray.width / 2,
      this.layout.tray.y + this.layout.tray.height / 2 + 8,
    ).setDepth(80);
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
    this.showToast(`翻面 · 现在烤${skewer.downSide === 0 ? "蓝" : "橙"}面`, 0xbfdbfe);
  }

  private updateMovingIngredients(seconds: number): void {
    for (const ingredient of [...this.movingIngredients]) {
      ingredient.view.x += ingredient.direction * ingredient.speed * seconds;
      const left = this.layout.prep.x - 40;
      const right = this.layout.prep.x + this.layout.prep.width + 40;
      if ((ingredient.direction === 1 && ingredient.view.x > right) || (ingredient.direction === -1 && ingredient.view.x < left)) {
        ingredient.view.destroy();
        this.movingIngredients = this.movingIngredients.filter((item) => item !== ingredient);
        this.spawnIngredient();
      }
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
        band += value >= 125 ? "B" : value >= 70 ? "P" : value >= 40 ? "W" : "R";
      }
      if (band !== skewer.lastVisualBand) {
        skewer.lastVisualBand = band;
        if (band.includes("B")) this.showToast("焦糊警告！快拿开", 0xfca5a5);
        else if (band.length > 0 && [...band].every((value) => value === "P")) this.showToast("这一面火候正好，可以翻面", 0xfef08a);
      }
      this.refreshSkewerVisual(skewer);
    }
  }

  private tryServe(skewer: SkewerState): boolean {
    if (!this.sameRecipe(skewer.pieces.map(({ kind }) => kind), this.order.recipe)) {
      this.score = Math.max(0, this.score - 50);
      this.combo = 0;
      this.order.patience = Math.max(0, this.order.patience - this.order.maxPatience * 0.2);
      this.showToast("配方不对 · 顾客拒收  -50", 0xfca5a5);
      return false;
    }

    if (skewer.pieces.some((piece) => piece.sides.some((side) => side < 20))) {
      this.score = Math.max(0, this.score - 50);
      this.combo = 0;
      this.order.patience = Math.max(0, this.order.patience - this.order.maxPatience * 0.2);
      this.showToast("还有生面 · 顾客拒收  -50", 0xfca5a5);
      return false;
    }

    const qualities = skewer.pieces.map((piece) => this.qualityMultiplier(piece));
    const allPerfect = qualities.every((quality) => quality === 1);
    const hasBadPiece = qualities.some((quality) => quality <= 0.4);
    const foodScore = qualities.reduce((sum, quality) => sum + 100 * quality, 0);
    const speedScore = 150 * (this.order.patience / this.order.maxPatience);
    if (hasBadPiece) this.combo = 0;
    else this.combo += 1;
    const comboMultiplier = Math.min(1.5, 1 + this.combo * 0.1);
    const earned = Math.round((foodScore + speedScore) * comboMultiplier);
    this.score += earned;
    this.completedOrders += 1;
    if (allPerfect) this.perfectOrders += 1;
    this.showToast(`${allPerfect ? "完美出餐" : "出餐成功"}  +${earned}`, allPerfect ? 0xfef08a : 0xbbf7d0);
    this.destroySkewer(skewer);
    this.ensurePrepSkewer(skewer);
    this.createOrder();
    return true;
  }

  private qualityMultiplier(piece: PieceState): number {
    const [a, b] = piece.sides;
    if (a >= 125 || b >= 125) return 0.15;
    if (a < 40 || b < 40 || a > 100 || b > 100) return 0.4;
    if (a >= 70 && a <= 100 && b >= 70 && b <= 100) return 1;
    return 0.75;
  }

  private sameRecipe(actual: IngredientKind[], expected: IngredientKind[]): boolean {
    if (actual.length !== expected.length) return false;
    return [...actual].sort().join("|") === [...expected].sort().join("|");
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
    this.comboText.setText(`连击 x${this.combo} · 最高倍率 ${Math.min(1.5, 1 + this.combo * 0.1).toFixed(1)}`);
    this.patienceText?.setText(`耐心 ${Math.ceil(this.order.patience)}s`);
    if (this.patienceFill) {
      const ratio = Phaser.Math.Clamp(this.order.patience / this.order.maxPatience, 0, 1);
      this.patienceFill.displayWidth = (this.layout.order.width - 28) * ratio;
      this.patienceFill.setFillStyle(ratio < 0.25 ? 0xef4444 : ratio < 0.55 ? 0xf59e0b : 0x60a5fa);
    }
  }

  private updateStateReadout(): void {
    const describe = (skewer: SkewerState | null) => {
      if (!skewer) return "空";
      if (skewer.pieces.length === 0) return "空签";
      return skewer.pieces.map((piece) => `${FOOD[piece.kind].shortLabel}${Math.round(piece.sides[0])}/${Math.round(piece.sides[1])}`).join(" ");
    };
    this.stateText.setText(
      `蓝/橙=正反熟度  托盘:${describe(this.traySkewer)}  烤1:${describe(this.grillSlots[0])}  烤2:${describe(this.grillSlots[1])}`,
    );
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
    const veil = this.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, 0x0c0a09, 0.86).setDepth(500);
    const card = this.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2 - 10, 320, 330, 0x292524, 1)
      .setStrokeStyle(2, 0xf59e0b, 0.8)
      .setDepth(501);
    const title = this.add.text(WORLD_WIDTH / 2, WORLD_HEIGHT / 2 - 130, "本局结束", {
      fontFamily: "inherit",
      fontSize: "28px",
      fontStyle: "bold",
      color: "#fff7ed",
    }).setOrigin(0.5).setDepth(502);
    const stats = this.add.text(
      WORLD_WIDTH / 2,
      WORLD_HEIGHT / 2 - 48,
      `积分  ${this.score}\n完成订单  ${this.completedOrders}\n完美出餐  ${this.perfectOrders}\n最终连击  ${this.combo}`,
      {
        fontFamily: "inherit",
        fontSize: "18px",
        color: "#e7e5e4",
        align: "center",
        lineSpacing: 11,
      },
    ).setOrigin(0.5).setDepth(502);
    const replay = this.add.text(WORLD_WIDTH / 2, WORLD_HEIGHT / 2 + 115, "再来一局", {
      fontFamily: "inherit",
      fontSize: "18px",
      fontStyle: "bold",
      color: "#1c1917",
      backgroundColor: "#fbbf24",
      padding: { left: 34, right: 34, top: 12, bottom: 12 },
    }).setOrigin(0.5).setDepth(502).setInteractive({ useHandCursor: true });
    replay.on("pointerdown", () => this.scene.restart());
    void veil;
    void card;
    void title;
    void stats;
  }

  private contains(rect: RectSpec, x: number, y: number): boolean {
    return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
  }

  private pauseClock(): void {
    this.clockPaused = true;
  }

  private resumeClock(): void {
    this.clockPaused = false;
  }
}
