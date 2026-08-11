import { LEVEL_FIVE, LEVEL_FOUR, LEVEL_SIX, LEVEL_THREE, LEVEL_TWO, starsForScore, type LevelId } from "./levelOneRules.ts";

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
  levelThreeBestScore: number;
  levelThreeBestStars: 0 | 1 | 2 | 3;
  levelFourBestScore: number;
  levelFourBestStars: 0 | 1 | 2 | 3;
  levelFiveBestScore: number;
  levelFiveBestStars: 0 | 1 | 2 | 3;
  levelSixBestScore: number;
  levelSixBestStars: 0 | 1 | 2 | 3;
  tutorialCompleted: boolean;
  levelTwoUnlocked: boolean;
  levelThreeUnlocked: boolean;
  levelFourUnlocked: boolean;
  levelFiveUnlocked: boolean;
  levelSixUnlocked: boolean;
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
  levelThreeBestScore: 0,
  levelThreeBestStars: 0,
  levelFourBestScore: 0,
  levelFourBestStars: 0,
  levelFiveBestScore: 0,
  levelFiveBestStars: 0,
  levelSixBestScore: 0,
  levelSixBestStars: 0,
  tutorialCompleted: false,
  levelTwoUnlocked: false,
  levelThreeUnlocked: false,
  levelFourUnlocked: false,
  levelFiveUnlocked: false,
  levelSixUnlocked: false,
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
    const levelThreeBestScore = Math.max(0, Number(saved.levelThreeBestScore) || 0);
    const savedLevelThreeStars = Math.max(0, Math.min(3, Number(saved.levelThreeBestStars) || 0));
    const levelThreeBestStars = Math.max(
      savedLevelThreeStars,
      starsForScore(levelThreeBestScore, LEVEL_THREE),
    ) as 0 | 1 | 2 | 3;
    const levelFourBestScore = Math.max(0, Number(saved.levelFourBestScore) || 0);
    const savedLevelFourStars = Math.max(0, Math.min(3, Number(saved.levelFourBestStars) || 0));
    const levelFourBestStars = Math.max(
      savedLevelFourStars,
      starsForScore(levelFourBestScore, LEVEL_FOUR),
    ) as 0 | 1 | 2 | 3;
    const levelFiveBestScore = Math.max(0, Number(saved.levelFiveBestScore) || 0);
    const savedLevelFiveStars = Math.max(0, Math.min(3, Number(saved.levelFiveBestStars) || 0));
    const levelFiveBestStars = Math.max(
      savedLevelFiveStars,
      starsForScore(levelFiveBestScore, LEVEL_FIVE),
    ) as 0 | 1 | 2 | 3;
    const levelSixBestScore = Math.max(0, Number(saved.levelSixBestScore) || 0);
    const savedLevelSixStars = Math.max(0, Math.min(3, Number(saved.levelSixBestStars) || 0));
    const levelSixBestStars = Math.max(
      savedLevelSixStars,
      starsForScore(levelSixBestScore, LEVEL_SIX),
    ) as 0 | 1 | 2 | 3;
    return {
      levelOneBestScore: bestScore,
      levelOneBestStars: bestStars,
      levelTwoBestScore,
      levelTwoBestStars,
      levelThreeBestScore,
      levelThreeBestStars,
      levelFourBestScore,
      levelFourBestStars,
      levelFiveBestScore,
      levelFiveBestStars,
      levelSixBestScore,
      levelSixBestStars,
      tutorialCompleted: saved.tutorialCompleted === true,
      levelTwoUnlocked: bestStars >= 1,
      levelThreeUnlocked: levelTwoBestStars >= 1,
      levelFourUnlocked: levelThreeBestStars >= 1,
      levelFiveUnlocked: levelFourBestStars >= 1,
      levelSixUnlocked: levelFiveBestStars >= 1,
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
  let next: GameProgress;
  if (levelId === 1) {
    next = {
        ...current,
        levelOneBestScore: Math.max(current.levelOneBestScore, result.score),
        levelOneBestStars: Math.max(current.levelOneBestStars, result.stars) as 0 | 1 | 2 | 3,
        levelTwoUnlocked: Math.max(current.levelOneBestStars, result.stars) >= 1,
      };
  } else if (levelId === 2) {
    next = {
        ...current,
        levelTwoBestScore: Math.max(current.levelTwoBestScore, result.score),
        levelTwoBestStars: Math.max(current.levelTwoBestStars, result.stars) as 0 | 1 | 2 | 3,
        levelThreeUnlocked: Math.max(current.levelTwoBestStars, result.stars) >= 1,
      };
  } else if (levelId === 3) {
    next = {
      ...current,
      levelThreeBestScore: Math.max(current.levelThreeBestScore, result.score),
      levelThreeBestStars: Math.max(current.levelThreeBestStars, result.stars) as 0 | 1 | 2 | 3,
      levelFourUnlocked: Math.max(current.levelThreeBestStars, result.stars) >= 1,
    };
  } else if (levelId === 4) {
    next = {
      ...current,
      levelFourBestScore: Math.max(current.levelFourBestScore, result.score),
      levelFourBestStars: Math.max(current.levelFourBestStars, result.stars) as 0 | 1 | 2 | 3,
      levelFiveUnlocked: Math.max(current.levelFourBestStars, result.stars) >= 1,
    };
  } else if (levelId === 5) {
    next = {
      ...current,
      levelFiveBestScore: Math.max(current.levelFiveBestScore, result.score),
      levelFiveBestStars: Math.max(current.levelFiveBestStars, result.stars) as 0 | 1 | 2 | 3,
      levelSixUnlocked: Math.max(current.levelFiveBestStars, result.stars) >= 1,
    };
  } else {
    next = {
      ...current,
      levelSixBestScore: Math.max(current.levelSixBestScore, result.score),
      levelSixBestStars: Math.max(current.levelSixBestStars, result.stars) as 0 | 1 | 2 | 3,
    };
  }
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
