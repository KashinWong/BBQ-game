import Phaser from "phaser";
import { loadBrowserProgress } from "./browserProgress";
import { createBrowserSettingsStore } from "./browserSettings";
import { showSettingsPanel } from "./SettingsPanel";

const WIDTH = 390;
const HEIGHT = 844;

export class MainMenuScene extends Phaser.Scene {
  private readonly settings = createBrowserSettingsStore();
  private settingsPanel?: Phaser.GameObjects.Container;

  constructor() {
    super({ key: "MainMenu" });
  }

  create(): void {
    const previewLevel = import.meta.env.DEV
      ? Number(new URLSearchParams(window.location.search).get("previewLevel"))
      : 0;
    if (previewLevel >= 1 && previewLevel <= 6) {
      this.scene.start("Gameplay", { levelId: previewLevel });
      return;
    }

    const progress = loadBrowserProgress();
    const totalStars = progress.levelOneBestStars + progress.levelTwoBestStars + progress.levelThreeBestStars + progress.levelFourBestStars + progress.levelFiveBestStars + progress.levelSixBestStars;
    const totalScore = progress.levelOneBestScore + progress.levelTwoBestScore + progress.levelThreeBestScore + progress.levelFourBestScore + progress.levelFiveBestScore + progress.levelSixBestScore;
    const g = this.add.graphics();
    g.fillGradientStyle(0x160b18, 0x160b18, 0x542512, 0x2a120d, 1);
    g.fillRect(0, 0, WIDTH, HEIGHT);
    g.fillStyle(0x7c2d12, 0.34).fillCircle(52, 182, 116);
    g.fillStyle(0xf59e0b, 0.1).fillCircle(352, 268, 145);
    g.lineStyle(2, 0xa85d33, 0.8).lineBetween(0, 74, WIDTH, 50);
    for (let x = 22; x < WIDTH; x += 48) {
      const y = 73 - x * 0.06;
      g.fillStyle(0xfbbf24, 0.95).fillCircle(x, y, 4);
      g.fillStyle(0xfbbf24, 0.13).fillCircle(x, y, 13);
    }

    this.add.text(WIDTH / 2, 160, "🔥", { fontSize: "70px" }).setOrigin(0.5);
    this.add.text(WIDTH / 2, 247, "烤串高手", {
      fontFamily: "inherit",
      fontSize: "46px",
      fontStyle: "bold",
      color: "#fff7ed",
      stroke: "#7c2d12",
      strokeThickness: 6,
    }).setOrigin(0.5);
    this.add.text(WIDTH / 2, 297, "选好食材 · 掌握火候 · 满足订单", {
      fontFamily: "inherit",
      fontSize: "14px",
      color: "#e7b98d",
      letterSpacing: 1,
    }).setOrigin(0.5);

    const record = this.add.container(WIDTH / 2, 385);
    const recordBg = this.add.rectangle(0, 0, 330, 96, 0x2d1713, 0.92)
      .setStrokeStyle(2, 0x8b4d2e, 0.85);
    const stars = this.add.text(-78, -18, `${totalStars}/18 ★`, {
      fontFamily: "inherit", fontSize: "24px", fontStyle: "bold", color: "#facc15",
    }).setOrigin(0.5);
    const score = this.add.text(82, -18, `${totalScore} 分`, {
      fontFamily: "inherit", fontSize: "21px", fontStyle: "bold", color: "#fdba74",
    }).setOrigin(0.5);
    const progressNote = progress.levelSixBestStars > 0
      ? "六关全部通关，继续挑战满星与最高分"
      : progress.levelSixUnlocked
        ? "终局考核已经开放，守住三炉与双订单"
      : progress.levelFiveUnlocked
        ? "三炉摊已经开放，挑战三串并行烤制"
      : progress.levelFourUnlocked
        ? "双客摊已经开放，同时处理两个订单"
      : progress.levelThreeUnlocked
        ? "流动摊已经开放，挑战移动食材"
      : progress.levelTwoUnlocked ? "晚市已经开放，香肠等你来烤" : "第 1 关获得一星，解锁晚市";
    const note = this.add.text(0, 25, progressNote, {
      fontFamily: "inherit", fontSize: "12px", color: "#d6b291",
    }).setOrigin(0.5);
    record.add([recordBg, stars, score, note]);

    const start = this.add.text(WIDTH / 2, 515, "开始营业", {
      fontFamily: "inherit",
      fontSize: "24px",
      fontStyle: "bold",
      color: "#321507",
      backgroundColor: "#f6b84a",
      padding: { left: 62, right: 62, top: 17, bottom: 17 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    start.on("pointerdown", () => this.scene.start("LevelSelect"));
    this.tweens.add({ targets: start, scale: 1.035, duration: 850, yoyo: true, repeat: -1, ease: "Sine.InOut" });

    const settings = this.add.text(WIDTH / 2, 674, "⚙ 设置", {
      fontFamily: "inherit",
      fontSize: "16px",
      fontStyle: "bold",
      color: "#fed7aa",
      backgroundColor: "#3d2418",
      padding: { left: 26, right: 26, top: 10, bottom: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    settings.on("pointerdown", () => this.openSettings());

    this.add.text(WIDTH / 2, 614, "MVP · 六个完整关卡", {
      fontFamily: "inherit", fontSize: "12px", color: "#a88b7b",
    }).setOrigin(0.5);
    this.add.text(WIDTH / 2, 790, "建议开启声音并使用竖屏游玩", {
      fontFamily: "inherit", fontSize: "11px", color: "#80695d",
    }).setOrigin(0.5);
  }

  private openSettings(): void {
    if (this.settingsPanel?.active) return;
    this.settingsPanel = showSettingsPanel(this, this.settings, () => {
      this.settingsPanel = undefined;
    });
  }
}
