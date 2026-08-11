import assert from "node:assert/strict";
import test from "node:test";
import { loadProgress, recordLevelOneResult, recordLevelResult } from "./progress.ts";

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

test("level one progress keeps the best result and unlocks level two after one star", () => {
  const storage = new MemoryStorage();

  recordLevelOneResult(storage, { score: 1450, stars: 2, tutorialCompleted: true });
  recordLevelOneResult(storage, { score: 1100, stars: 1, tutorialCompleted: false });

  assert.deepEqual(loadProgress(storage), {
    levelOneBestScore: 1450,
    levelOneBestStars: 3,
    levelTwoBestScore: 0,
    levelTwoBestStars: 0,
    levelThreeBestScore: 0,
    levelThreeBestStars: 0,
    levelFourBestScore: 0,
    levelFourBestStars: 0,
    levelFiveBestScore: 0,
    levelFiveBestStars: 0,
    levelSixBestScore: 0,
    levelSixBestStars: 0,
    tutorialCompleted: true,
    levelTwoUnlocked: true,
    levelThreeUnlocked: false,
    levelFourUnlocked: false,
    levelFiveUnlocked: false,
    levelSixUnlocked: false,
  });
});

test("level two stores its own best score and stars", () => {
  const storage = new MemoryStorage();
  recordLevelOneResult(storage, { score: 700, stars: 1, tutorialCompleted: true });
  recordLevelResult(storage, 2, { score: 1510, stars: 2 });
  recordLevelResult(storage, 2, { score: 1200, stars: 1 });

  const progress = loadProgress(storage);
  assert.equal(progress.levelTwoBestScore, 1510);
  assert.equal(progress.levelTwoBestStars, 2);
  assert.equal(progress.levelTwoUnlocked, true);
});

test("level three stores its own best result after level two unlocks it", () => {
  const storage = new MemoryStorage();
  recordLevelOneResult(storage, { score: 700, stars: 1, tutorialCompleted: true });
  recordLevelResult(storage, 2, { score: 950, stars: 1 });
  recordLevelResult(storage, 3, { score: 1850, stars: 2 });

  const progress = loadProgress(storage);
  assert.equal(progress.levelThreeUnlocked, true);
  assert.equal(progress.levelThreeBestScore, 1850);
  assert.equal(progress.levelThreeBestStars, 2);
});

test("level four unlocks after level three earns a star and stores its own result", () => {
  const storage = new MemoryStorage();
  recordLevelOneResult(storage, { score: 700, stars: 1, tutorialCompleted: true });
  recordLevelResult(storage, 2, { score: 950, stars: 1 });
  recordLevelResult(storage, 3, { score: 1250, stars: 1 });
  recordLevelResult(storage, 4, { score: 2250, stars: 2 });

  const progress = loadProgress(storage);
  assert.equal(progress.levelFourUnlocked, true);
  assert.equal(progress.levelFourBestScore, 2250);
  assert.equal(progress.levelFourBestStars, 2);
});

test("level five unlocks after level four earns a star and stores its own result", () => {
  const storage = new MemoryStorage();
  recordLevelOneResult(storage, { score: 700, stars: 1, tutorialCompleted: true });
  recordLevelResult(storage, 2, { score: 950, stars: 1 });
  recordLevelResult(storage, 3, { score: 1250, stars: 1 });
  recordLevelResult(storage, 4, { score: 1550, stars: 1 });
  recordLevelResult(storage, 5, { score: 2850, stars: 2 });

  const progress = loadProgress(storage);
  assert.equal(progress.levelFiveUnlocked, true);
  assert.equal(progress.levelFiveBestScore, 2850);
  assert.equal(progress.levelFiveBestStars, 2);
});

test("level six unlocks after level five earns a star and stores the final result", () => {
  const storage = new MemoryStorage();
  recordLevelOneResult(storage, { score: 700, stars: 1, tutorialCompleted: true });
  recordLevelResult(storage, 2, { score: 950, stars: 1 });
  recordLevelResult(storage, 3, { score: 1250, stars: 1 });
  recordLevelResult(storage, 4, { score: 1550, stars: 1 });
  recordLevelResult(storage, 5, { score: 1950, stars: 1 });
  recordLevelResult(storage, 6, { score: 3450, stars: 2 });

  const progress = loadProgress(storage);
  assert.equal(progress.levelSixUnlocked, true);
  assert.equal(progress.levelSixBestScore, 3450);
  assert.equal(progress.levelSixBestStars, 2);
});

test("an existing score is upgraded when the easier star target changes", () => {
  const storage = new MemoryStorage();
  recordLevelOneResult(storage, { score: 699, stars: 0, tutorialCompleted: true });

  assert.deepEqual(loadProgress(storage), {
    levelOneBestScore: 699,
    levelOneBestStars: 1,
    levelTwoBestScore: 0,
    levelTwoBestStars: 0,
    levelThreeBestScore: 0,
    levelThreeBestStars: 0,
    levelFourBestScore: 0,
    levelFourBestStars: 0,
    levelFiveBestScore: 0,
    levelFiveBestStars: 0,
    levelSixBestScore: 0,
    levelSixBestStars: 0,
    tutorialCompleted: true,
    levelTwoUnlocked: true,
    levelThreeUnlocked: false,
    levelFourUnlocked: false,
    levelFiveUnlocked: false,
    levelSixUnlocked: false,
  });
});
