import assert from "node:assert/strict";
import test from "node:test";
import { loadProgress, recordLevelOneResult } from "./progress.ts";

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
    tutorialCompleted: true,
    levelTwoUnlocked: true,
  });
});

test("an existing score is upgraded when the easier star target changes", () => {
  const storage = new MemoryStorage();
  recordLevelOneResult(storage, { score: 699, stars: 0, tutorialCompleted: true });

  assert.deepEqual(loadProgress(storage), {
    levelOneBestScore: 699,
    levelOneBestStars: 1,
    tutorialCompleted: true,
    levelTwoUnlocked: true,
  });
});
