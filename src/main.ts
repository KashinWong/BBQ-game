import Phaser from "phaser";
import { GameplayScene } from "./game/GameplayScene";
import { LevelSelectScene } from "./game/LevelSelectScene";
import { MainMenuScene } from "./game/MainMenuScene";
import "./styles.css";

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
  scene: [new MainMenuScene(), new LevelSelectScene(), new GameplayScene()],
});
