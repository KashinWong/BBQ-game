import assert from "node:assert/strict";
import test from "node:test";
import { buildIngredientLaneYs } from "./prepLayout.ts";

test("ingredient lanes keep the skewer dock visually clear", () => {
  const laneYs = buildIngredientLaneYs(540, 245, 3);
  assert.ok(Math.max(...laneYs) <= 748 - 72);
});
