import assert from "node:assert/strict";
import test from "node:test";
import { LEVEL_FIVE, LEVEL_FOUR, LEVEL_SIX, LEVEL_THREE, LEVEL_TWO } from "./levelOneRules.ts";

test("level two adds sausage and gentle motion without hiding ingredients", () => {
  assert.equal(LEVEL_TWO.id, 2);
  assert.deepEqual(LEVEL_TWO.starScores, [900, 1400, 1900]);
  assert.ok(LEVEL_TWO.ingredientKinds.includes("sausage"));
  assert.ok(LEVEL_TWO.ingredientMotionAmplitude > 0);
  assert.ok(LEVEL_TWO.ingredientMotionAmplitude <= 14);
  assert.equal(LEVEL_TWO.tutorial, false);
  assert.ok(LEVEL_TWO.recipes.every((recipe) => recipe.length >= 2 && recipe.length <= 3));
});

test("level five opens a third grill slot and uses three-to-four-piece orders", () => {
  assert.equal(LEVEL_FIVE.id, 5);
  assert.deepEqual(LEVEL_FIVE.starScores, [1900, 2800, 3700]);
  assert.equal(LEVEL_FIVE.grillSlots, 3);
  assert.equal(LEVEL_FIVE.simultaneousOrders, 2);
  assert.ok(LEVEL_FIVE.ingredientSpeed > LEVEL_FOUR.ingredientSpeed);
  assert.ok(LEVEL_FIVE.recipes.every((recipe) => recipe.length >= 3 && recipe.length <= 4));
  assert.ok(LEVEL_FIVE.recipes.some((recipe) => recipe.length === 4));
});

test("level six combines every pressure at the fastest ingredient speed", () => {
  assert.equal(LEVEL_SIX.id, 6);
  assert.deepEqual(LEVEL_SIX.starScores, [2300, 3400, 4500]);
  assert.equal(LEVEL_SIX.grillSlots, 3);
  assert.equal(LEVEL_SIX.simultaneousOrders, 2);
  assert.ok(LEVEL_SIX.ingredientSpeed > LEVEL_FIVE.ingredientSpeed);
  assert.equal(LEVEL_SIX.ingredientKinds.length, 6);
  assert.ok(LEVEL_SIX.recipes.every((recipe) => recipe.length >= 3 && recipe.length <= 4));
  assert.ok(LEVEL_SIX.recipes.some((recipe) => new Set(recipe).size < recipe.length));
});

test("level four introduces chicken and two simultaneous three-piece orders", () => {
  assert.equal(LEVEL_FOUR.id, 4);
  assert.deepEqual(LEVEL_FOUR.starScores, [1500, 2200, 3000]);
  assert.equal(LEVEL_FOUR.simultaneousOrders, 2);
  assert.ok(LEVEL_FOUR.ingredientKinds.includes("chicken"));
  assert.ok(LEVEL_FOUR.ingredientSpeed > LEVEL_THREE.ingredientSpeed);
  assert.ok(LEVEL_FOUR.recipes.every((recipe) => recipe.length === 3));
});

test("level three introduces corn, repeated ingredients and moving prep", () => {
  assert.equal(LEVEL_THREE.id, 3);
  assert.deepEqual(LEVEL_THREE.starScores, [1200, 1800, 2400]);
  assert.ok(LEVEL_THREE.ingredientKinds.includes("corn"));
  assert.ok(LEVEL_THREE.ingredientSpeed > 0);
  assert.ok(LEVEL_THREE.recipes.some((recipe) => new Set(recipe).size < recipe.length));
  assert.ok(LEVEL_THREE.recipes.every((recipe) => recipe.length >= 2 && recipe.length <= 3));
});
