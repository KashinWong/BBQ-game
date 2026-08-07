import assert from "node:assert/strict";
import test from "node:test";
import { buildLevelSelection } from "./levelSelection.ts";
import type { GameProgress } from "./progress.ts";

const lockedProgress: GameProgress = {
  levelOneBestScore: 0,
  levelOneBestStars: 0,
  levelTwoBestScore: 0,
  levelTwoBestStars: 0,
  tutorialCompleted: false,
  levelTwoUnlocked: false,
};

test("level selection unlocks level two only after level one earns a star", () => {
  const locked = buildLevelSelection(lockedProgress);
  assert.equal(locked[0].status, "playable");
  assert.equal(locked[1].status, "locked");
  assert.equal(locked[2].status, "coming-soon");

  const unlocked = buildLevelSelection({ ...lockedProgress, levelOneBestStars: 1, levelTwoUnlocked: true });
  assert.equal(unlocked[1].status, "playable");
});
