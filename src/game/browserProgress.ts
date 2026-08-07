import { loadProgress, type GameProgress } from "./progress";

const EMPTY_PROGRESS: GameProgress = {
  levelOneBestScore: 0,
  levelOneBestStars: 0,
  levelTwoBestScore: 0,
  levelTwoBestStars: 0,
  tutorialCompleted: false,
  levelTwoUnlocked: false,
};

export function loadBrowserProgress(): GameProgress {
  try {
    return loadProgress(window.localStorage);
  } catch {
    return { ...EMPTY_PROGRESS };
  }
}
