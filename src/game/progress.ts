import { starsForScore } from "./levelOneRules.ts";

const STORAGE_KEY = "bbq-master.progress.v1";

export interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface GameProgress {
  levelOneBestScore: number;
  levelOneBestStars: 0 | 1 | 2 | 3;
  tutorialCompleted: boolean;
  levelTwoUnlocked: boolean;
}

export interface LevelOneResult {
  score: number;
  stars: 0 | 1 | 2 | 3;
  tutorialCompleted: boolean;
}

const DEFAULT_PROGRESS: GameProgress = {
  levelOneBestScore: 0,
  levelOneBestStars: 0,
  tutorialCompleted: false,
  levelTwoUnlocked: false,
};

export function loadProgress(storage: StoragePort): GameProgress {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROGRESS };
    const saved = JSON.parse(raw) as Partial<GameProgress>;
    const bestScore = Math.max(0, Number(saved.levelOneBestScore) || 0);
    const savedStars = Math.max(0, Math.min(3, Number(saved.levelOneBestStars) || 0));
    const bestStars = Math.max(savedStars, starsForScore(bestScore)) as 0 | 1 | 2 | 3;
    return {
      levelOneBestScore: bestScore,
      levelOneBestStars: bestStars,
      tutorialCompleted: saved.tutorialCompleted === true,
      levelTwoUnlocked: bestStars >= 1,
    };
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

export function recordLevelOneResult(storage: StoragePort, result: LevelOneResult): GameProgress {
  const current = loadProgress(storage);
  const next: GameProgress = {
    levelOneBestScore: Math.max(current.levelOneBestScore, result.score),
    levelOneBestStars: Math.max(current.levelOneBestStars, result.stars) as 0 | 1 | 2 | 3,
    tutorialCompleted: current.tutorialCompleted || result.tutorialCompleted,
    levelTwoUnlocked: Math.max(current.levelOneBestStars, result.stars) >= 1,
  };
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage is optional; gameplay and the current result still continue.
  }
  return next;
}
