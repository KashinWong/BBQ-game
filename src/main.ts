import Phaser from "phaser";
import { GameScene } from "./prototype/GameScene";
import "./styles.css";

// PROTOTYPE — Layout A (上下工作台) was selected after the layout comparison.

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "app",
  width: 390,
  height: 844,
  backgroundColor: "#171412",
  render: {
    antialias: true,
    pixelArt: false,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: {
    activePointers: 2,
  },
  scene: [new GameScene()],
});
