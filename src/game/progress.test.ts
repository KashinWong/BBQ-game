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
    tutorialCompleted: true,
    levelTwoUnlocked: true,
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

test("an existing score is upgraded when the easier star target changes", () => {
  const storage = new MemoryStorage();
  recordLevelOneResult(storage, { score: 699, stars: 0, tutorialCompleted: true });

  assert.deepEqual(loadProgress(storage), {
    levelOneBestScore: 699,
    levelOneBestStars: 1,
    levelTwoBestScore: 0,
    levelTwoBestStars: 0,
    tutorialCompleted: true,
    levelTwoUnlocked: true,
  });
});
