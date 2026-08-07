import assert from "node:assert/strict";
import test from "node:test";
import { LEVEL_TWO } from "./levelOneRules.ts";

test("level two adds sausage and gentle motion without hiding ingredients", () => {
  assert.equal(LEVEL_TWO.id, 2);
  assert.deepEqual(LEVEL_TWO.starScores, [900, 1400, 1900]);
  assert.ok(LEVEL_TWO.ingredientKinds.includes("sausage"));
  assert.ok(LEVEL_TWO.ingredientMotionAmplitude > 0);
  assert.ok(LEVEL_TWO.ingredientMotionAmplitude <= 14);
  assert.equal(LEVEL_TWO.tutorial, false);
  assert.ok(LEVEL_TWO.recipes.every((recipe) => recipe.length >= 2 && recipe.length <= 3));
});
