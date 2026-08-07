import assert from "node:assert/strict";
import test from "node:test";
import { SKEWER_INTERACTION } from "./interactionGeometry.ts";

test("a skewer has a thumb-friendly grab area and starts dragging promptly", () => {
  assert.ok(SKEWER_INTERACTION.width >= 240);
  assert.ok(SKEWER_INTERACTION.height >= 88);
  assert.ok(SKEWER_INTERACTION.dragThreshold <= 5);
});
