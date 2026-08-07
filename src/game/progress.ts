import { LEVEL_TWO, starsForScore, type LevelId } from "./levelOneRules.ts";

const STORAGE_KEY = "bbq-master.progress.v1";

export interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface GameProgress {
  levelOneBestScore: number;
  levelOneBestStars: 0 | 1 | 2 | 3;
  levelTwoBestScore: number;
  levelTwoBestStars: 0 | 1 | 2 | 3;
  tutorialCompleted: boolean;
  levelTwoUnlocked: boolean;
}

export interface LevelOneResult {
  score: number;
  stars: 0 | 1 | 2 | 3;
  tutorialCompleted: boolean;
}

export interface LevelResult {
  score: number;
  stars: 0 | 1 | 2 | 3;
}

const DEFAULT_PROGRESS: GameProgress = {
  levelOneBestScore: 0,
  levelOneBestStars: 0,
  levelTwoBestScore: 0,
  levelTwoBestStars: 0,
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
    const levelTwoBestScore = Math.max(0, Number(saved.levelTwoBestScore) || 0);
    const savedLevelTwoStars = Math.max(0, Math.min(3, Number(saved.levelTwoBestStars) || 0));
    const levelTwoBestStars = Math.max(
      savedLevelTwoStars,
      starsForScore(levelTwoBestScore, LEVEL_TWO),
    ) as 0 | 1 | 2 | 3;
    return {
      levelOneBestScore: bestScore,
      levelOneBestStars: bestStars,
      levelTwoBestScore,
      levelTwoBestStars,
      tutorialCompleted: saved.tutorialCompleted === true,
      levelTwoUnlocked: bestStars >= 1,
    };
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

export function recordLevelOneResult(storage: StoragePort, result: LevelOneResult): GameProgress {
  const scored = recordLevelResult(storage, 1, result);
  const next = { ...scored, tutorialCompleted: scored.tutorialCompleted || result.tutorialCompleted };
  saveProgress(storage, next);
  return next;
}

export function recordLevelResult(storage: StoragePort, levelId: LevelId, result: LevelResult): GameProgress {
  const current = loadProgress(storage);
  const next: GameProgress = levelId === 1
    ? {
        ...current,
        levelOneBestScore: Math.max(current.levelOneBestScore, result.score),
        levelOneBestStars: Math.max(current.levelOneBestStars, result.stars) as 0 | 1 | 2 | 3,
        levelTwoUnlocked: Math.max(current.levelOneBestStars, result.stars) >= 1,
      }
    : {
        ...current,
        levelTwoBestScore: Math.max(current.levelTwoBestScore, result.score),
        levelTwoBestStars: Math.max(current.levelTwoBestStars, result.stars) as 0 | 1 | 2 | 3,
      };
  saveProgress(storage, next);
  return next;
}

function saveProgress(storage: StoragePort, progress: GameProgress): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Storage is optional; gameplay and the current result still continue.
  }
}
