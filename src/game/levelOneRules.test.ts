import assert from "node:assert/strict";
import test from "node:test";
import { evaluateService, LEVEL_ONE, starsForScore } from "./levelOneRules.ts";

test("level one exposes the approved 90-second progression targets", () => {
  assert.equal(LEVEL_ONE.durationSeconds, 90);
  assert.deepEqual(LEVEL_ONE.starScores, [600, 1000, 1400]);
  assert.equal(LEVEL_ONE.grillSlots, 2);
  assert.equal(LEVEL_ONE.ingredientSpeed, 0);
  assert.equal(LEVEL_ONE.pauseTimersDuringTutorial, true);
  assert.ok(LEVEL_ONE.recipes.every((recipe) => recipe.length === 2));
  assert.ok(LEVEL_ONE.recipes.every((recipe) => new Set(recipe).size === recipe.length));
  assert.deepEqual(LEVEL_ONE.recipes[0], ["mushroom", "beef"]);
  assert.ok(LEVEL_ONE.recipes.every((recipe) => !(recipe.includes("beef") && recipe.includes("pepper"))));
  assert.equal(starsForScore(599), 0);
  assert.equal(starsForScore(600), 1);
  assert.equal(starsForScore(1000), 2);
  assert.equal(starsForScore(1400), 3);
});

test("a perfect matching skewer is served with speed and combo rewards", () => {
  const result = evaluateService({
    expectedRecipe: ["beef", "pepper"],
    pieces: [
      { kind: "pepper", sides: [80, 92] },
      { kind: "beef", sides: [75, 86] },
    ],
    patienceRatio: 1,
    comboBefore: 0,
  });

  assert.deepEqual(result, {
    accepted: true,
    earnedScore: 385,
    comboAfter: 1,
    perfect: true,
    quality: "perfect",
  });
});

test("level one keeps slightly late food inside a forgiving perfect window", () => {
  const result = evaluateService({
    expectedRecipe: ["mushroom", "beef"],
    pieces: [
      { kind: "mushroom", sides: [82, 112] },
      { kind: "beef", sides: [76, 108] },
    ],
    patienceRatio: 0.5,
    comboBefore: 0,
  });

  assert.equal(result.accepted, true);
  if (result.accepted) {
    assert.equal(result.perfect, true);
    assert.equal(result.quality, "perfect");
  }
});

test("a matching skewer with a raw side is rejected and breaks the combo", () => {
  const result = evaluateService({
    expectedRecipe: ["beef", "pepper"],
    pieces: [
      { kind: "beef", sides: [80, 12] },
      { kind: "pepper", sides: [76, 82] },
    ],
    patienceRatio: 0.5,
    comboBefore: 4,
  });

  assert.deepEqual(result, {
    accepted: false,
    scorePenalty: 50,
    comboAfter: 0,
    reason: "raw",
  });
});
