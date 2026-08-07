import assert from "node:assert/strict";
import test from "node:test";
import { advanceTutorial, type TutorialStep } from "./tutorialFlow.ts";

test("first-play tutorial advances only after the matching player action", () => {
  let step: TutorialStep = "select-food";
  step = advanceTutorial(step, "recipe-complete");
  assert.equal(step, "place-on-grill");
  step = advanceTutorial(step, "placed-on-grill");
  assert.equal(step, "cook-first-side");
  step = advanceTutorial(step, "first-side-ready");
  assert.equal(step, "flip");
  step = advanceTutorial(step, "flipped");
  assert.equal(step, "cook-second-side");
  step = advanceTutorial(step, "both-sides-ready");
  assert.equal(step, "serve");
  step = advanceTutorial(step, "served");
  assert.equal(step, "score-explained");
  step = advanceTutorial(step, "continued");
  assert.equal(step, "complete");
  assert.equal(advanceTutorial("select-food", "flipped"), "select-food");
});
