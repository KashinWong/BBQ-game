import Phaser from "phaser";
import { type GameSettings, type GameSettingsStore } from "./settings.ts";

const WORLD_WIDTH = 390;
const WORLD_HEIGHT = 844;

type ToggleKey = keyof GameSettings;

interface ToggleDefinition {
  key: ToggleKey;
  label: string;
  description: string;
}

const TOGGLES: readonly ToggleDefinition[] = [
  { key: "musicEnabled", label: "音乐", description: "背景音乐偏好" },
  { key: "soundEnabled", label: "音效", description: "操作与提示音" },
  { key: "vibrationEnabled", label: "振动", description: "触控反馈" },
];

export function showSettingsPanel(
  scene: Phaser.Scene,
  settings: GameSettingsStore,
  onClose: () => void = () => {},
): Phaser.GameObjects.Container {
  const layer = scene.add.container(0, 0).setDepth(800);
  const veil = scene.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, 0x0c0705, 0.86)
    .setInteractive();
  const card = scene.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 340, 420, 0x3d2418, 1)
    .setStrokeStyle(2, 0xf6b84a, 0.9);
  const title = scene.add.text(WORLD_WIDTH / 2, 255, "设置", {
    fontFamily: "inherit",
    fontSize: "27px",
    fontStyle: "bold",
    color: "#fff7ed",
  }).setOrigin(0.5);
  const subtitle = scene.add.text(WORLD_WIDTH / 2, 288, "切换后会自动保存", {
    fontFamily: "inherit",
    fontSize: "12px",
    color: "#d6b291",
  }).setOrigin(0.5);

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    layer.destroy(true);
    onClose();
  };

  const items: Phaser.GameObjects.GameObject[] = [veil, card, title, subtitle];
  TOGGLES.forEach((definition, index) => {
    const y = 347 + index * 70;
    const row = scene.add.rectangle(WORLD_WIDTH / 2, y, 304, 58, 0x2a1a14, 0.98)
      .setStrokeStyle(1.5, 0x754126, 0.92)
      .setInteractive({ useHandCursor: true });
    const label = scene.add.text(58, y - 9, definition.label, {
      fontFamily: "inherit",
      fontSize: "17px",
      fontStyle: "bold",
      color: "#fff7ed",
    }).setOrigin(0, 0.5);
    const description = scene.add.text(58, y + 13, definition.description, {
      fontFamily: "inherit",
      fontSize: "10px",
      color: "#bca38d",
    }).setOrigin(0, 0.5);
    const status = scene.add.text(252, y, "", {
      fontFamily: "inherit",
      fontSize: "12px",
      fontStyle: "bold",
    }).setOrigin(1, 0.5);
    const track = scene.add.rectangle(291, y, 44, 24, 0x57534e, 1);
    const knob = scene.add.circle(281, y, 9, 0xf5f5f4, 1);
    const updateVisual = () => {
      const enabled = settings.get()[definition.key];
      status.setText(enabled ? "开启" : "关闭").setColor(enabled ? "#bbf7d0" : "#d6d3d1");
      track.setFillStyle(enabled ? 0x22a06b : 0x57534e);
      knob.setX(enabled ? 301 : 281);
    };
    row.on("pointerdown", () => {
      const current = settings.get();
      settings.update({ [definition.key]: !current[definition.key] } as Partial<GameSettings>);
      updateVisual();
    });
    updateVisual();
    items.push(row, label, description, status, track, knob);
  });

  const closeButton = scene.add.text(WORLD_WIDTH / 2, 588, "关闭", {
    fontFamily: "inherit",
    fontSize: "17px",
    fontStyle: "bold",
    color: "#321507",
    backgroundColor: "#f6b84a",
    padding: { left: 46, right: 46, top: 11, bottom: 11 },
  }).setOrigin(0.5).setInteractive({ useHandCursor: true });
  closeButton.on("pointerdown", close);
  items.push(closeButton);
  layer.add(items);

  const escape = scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
  const closeOnEscape = () => close();
  escape?.on("down", closeOnEscape);
  layer.once(Phaser.GameObjects.Events.DESTROY, () => escape?.off("down", closeOnEscape));
  return layer;
}
