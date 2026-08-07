import Phaser from "phaser";
import { loadBrowserProgress } from "./browserProgress";
import { buildLevelSelection, type LevelCard } from "./levelSelection";

const WIDTH = 390;
const HEIGHT = 844;

export class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: "LevelSelect" });
  }

  create(): void {
    const progress = loadBrowserProgress();
    const cards = buildLevelSelection(progress);
    const g = this.add.graphics();
    g.fillGradientStyle(0x170b17, 0x170b17, 0x4a2315, 0x25120f, 1).fillRect(0, 0, WIDTH, HEIGHT);
    g.fillStyle(0x2b1712, 0.96).fillRoundedRect(10, 13, 370, 68, 18);
    g.lineStyle(1.5, 0x7c4a2c, 0.8).strokeRoundedRect(10, 13, 370, 68, 18);

    const back = this.add.text(29, 47, "‹", {
      fontFamily: "inherit", fontSize: "35px", color: "#fed7aa",
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    back.on("pointerdown", () => this.scene.start("MainMenu"));
    this.add.text(56, 31, "选择关卡", {
      fontFamily: "inherit", fontSize: "22px", fontStyle: "bold", color: "#fff7ed",
    });
    this.add.text(57, 59, `已获得 ${progress.levelOneBestStars + progress.levelTwoBestStars}/6 ★`, {
      fontFamily: "inherit", fontSize: "11px", color: "#facc15",
    });

    this.createPlayableCard(cards[0], 186);
    this.createPlayableCard(cards[1], 334);

    this.add.text(24, 440, "后续摊位", {
      fontFamily: "inherit", fontSize: "15px", fontStyle: "bold", color: "#e7b98d",
    });
    cards.slice(2).forEach((card, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      this.createComingSoonCard(card, 105 + column * 180, 516 + row * 128);
    });
    this.add.text(WIDTH / 2, 790, "每关获得一星即可继续前进", {
      fontFamily: "inherit", fontSize: "11px", color: "#8f7568",
    }).setOrigin(0.5);
  }

  private createPlayableCard(card: LevelCard, y: number): void {
    const enabled = card.status === "playable";
    const container = this.add.container(WIDTH / 2, y);
    const bg = this.add.rectangle(0, 0, 344, 116, enabled ? 0x512a19 : 0x292321, 0.97)
      .setStrokeStyle(2, enabled ? 0xe78a43 : 0x5e5550, 0.9)
      .setInteractive({ useHandCursor: enabled });
    const badge = this.add.text(-143, -37, `第 ${card.id} 关`, {
      fontFamily: "inherit", fontSize: "12px", fontStyle: "bold", color: enabled ? "#3b1d0b" : "#c4b5ad",
      backgroundColor: enabled ? "#f6b84a" : "#4b4542",
      padding: { left: 10, right: 10, top: 4, bottom: 4 },
    }).setOrigin(0, 0.5);
    const title = this.add.text(-143, -4, card.title, {
      fontFamily: "inherit", fontSize: "23px", fontStyle: "bold", color: enabled ? "#fff7ed" : "#a8a29e",
    }).setOrigin(0, 0.5);
    const subtitle = this.add.text(-143, 26, card.status === "locked" ? card.unlockHint! : card.subtitle, {
      fontFamily: "inherit", fontSize: "11px", color: enabled ? "#e7b98d" : "#8e8580",
    }).setOrigin(0, 0.5);
    const score = this.add.text(132, -25, enabled ? `${card.bestScore} 分` : "🔒", {
      fontFamily: "inherit", fontSize: enabled ? "14px" : "24px", color: enabled ? "#fdba74" : "#a8a29e",
    }).setOrigin(1, 0.5);
    const stars = this.add.text(132, 18, enabled ? `${"★".repeat(card.bestStars)}${"☆".repeat(3 - card.bestStars)}` : "", {
      fontFamily: "inherit", fontSize: "19px", color: "#facc15",
    }).setOrigin(1, 0.5);
    container.add([bg, badge, title, subtitle, score, stars]);
    if (enabled) bg.on("pointerdown", () => this.scene.start("Gameplay", { levelId: card.id }));
  }

  private createComingSoonCard(card: LevelCard, x: number, y: number): void {
    const bg = this.add.rectangle(x, y, 164, 104, 0x29211f, 0.92).setStrokeStyle(1.5, 0x584945, 0.75);
    const number = this.add.text(x, y - 23, `${card.id}`, {
      fontFamily: "inherit", fontSize: "25px", fontStyle: "bold", color: "#8e7c74",
    }).setOrigin(0.5);
    const hint = this.add.text(x, y + 19, card.unlockHint ?? "后续开放", {
      fontFamily: "inherit", fontSize: "11px", color: "#776862",
    }).setOrigin(0.5);
    void bg;
    void number;
    void hint;
  }
}
