import assert from "node:assert/strict";
import test from "node:test";
import { buildLevelSelection } from "./levelSelection.ts";
import type { GameProgress } from "./progress.ts";

const lockedProgress: GameProgress = {
  levelOneBestScore: 0,
  levelOneBestStars: 0,
  levelTwoBestScore: 0,
  levelTwoBestStars: 0,
  levelThreeBestScore: 0,
  levelThreeBestStars: 0,
  levelFourBestScore: 0,
  levelFourBestStars: 0,
  levelFiveBestScore: 0,
  levelFiveBestStars: 0,
  tutorialCompleted: false,
  levelTwoUnlocked: false,
  levelThreeUnlocked: false,
  levelFourUnlocked: false,
  levelFiveUnlocked: false,
};

test("level selection unlocks level two only after level one earns a star", () => {
  const locked = buildLevelSelection(lockedProgress);
  assert.equal(locked[0].status, "playable");
  assert.equal(locked[1].status, "locked");
  assert.equal(locked[2].status, "locked");

  const unlocked = buildLevelSelection({ ...lockedProgress, levelOneBestStars: 1, levelTwoUnlocked: true });
  assert.equal(unlocked[1].status, "playable");
});

test("level selection unlocks level five only after level four earns a star", () => {
  const locked = buildLevelSelection({
    ...lockedProgress,
    levelTwoUnlocked: true,
    levelThreeUnlocked: true,
    levelFourUnlocked: true,
  });
  assert.equal(locked[4].status, "locked");

  const unlocked = buildLevelSelection({
    ...lockedProgress,
    levelTwoUnlocked: true,
    levelThreeUnlocked: true,
    levelFourUnlocked: true,
    levelFourBestStars: 1,
    levelFiveUnlocked: true,
  });
  assert.equal(unlocked[4].status, "playable");
});

test("level selection unlocks level four only after level three earns a star", () => {
  const locked = buildLevelSelection({
    ...lockedProgress,
    levelTwoUnlocked: true,
    levelThreeUnlocked: true,
  });
  assert.equal(locked[3].status, "locked");

  const unlocked = buildLevelSelection({
    ...lockedProgress,
    levelTwoUnlocked: true,
    levelThreeUnlocked: true,
    levelThreeBestStars: 1,
    levelFourUnlocked: true,
  });
  assert.equal(unlocked[3].status, "playable");
});

test("level selection unlocks level three only after level two earns a star", () => {
  const locked = buildLevelSelection({ ...lockedProgress, levelTwoUnlocked: true });
  assert.equal(locked[2].status, "locked");

  const unlocked = buildLevelSelection({
    ...lockedProgress,
    levelTwoUnlocked: true,
    levelTwoBestStars: 1,
    levelThreeUnlocked: true,
  });
  assert.equal(unlocked[2].status, "playable");
});
