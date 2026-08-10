import { loadProgress, type GameProgress } from "./progress";

const EMPTY_PROGRESS: GameProgress = {
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

export function loadBrowserProgress(): GameProgress {
  try {
    return loadProgress(window.localStorage);
  } catch {
    return { ...EMPTY_PROGRESS };
  }
}
