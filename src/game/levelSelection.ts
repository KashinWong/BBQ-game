import { LEVEL_FIVE, LEVEL_FOUR, LEVEL_ONE, LEVEL_SIX, LEVEL_THREE, LEVEL_TWO } from "./levelOneRules.ts";
import type { GameProgress } from "./progress.ts";

export type LevelCardStatus = "playable" | "locked" | "coming-soon";

export interface LevelCard {
  id: number;
  title: string;
  subtitle: string;
  bestScore: number;
  bestStars: number;
  status: LevelCardStatus;
  unlockHint?: string;
}

export function buildLevelSelection(progress: GameProgress): LevelCard[] {
  return [
    {
      id: LEVEL_ONE.id,
      title: LEVEL_ONE.title,
      subtitle: LEVEL_ONE.subtitle,
      bestScore: progress.levelOneBestScore,
      bestStars: progress.levelOneBestStars,
      status: "playable",
    },
    {
      id: LEVEL_TWO.id,
      title: LEVEL_TWO.title,
      subtitle: LEVEL_TWO.subtitle,
      bestScore: progress.levelTwoBestScore,
      bestStars: progress.levelTwoBestStars,
      status: progress.levelTwoUnlocked ? "playable" : "locked",
      unlockHint: progress.levelTwoUnlocked ? undefined : "第 1 关获得 1 星后解锁",
    },
    {
      id: LEVEL_THREE.id,
      title: LEVEL_THREE.title,
      subtitle: LEVEL_THREE.subtitle,
      bestScore: progress.levelThreeBestScore,
      bestStars: progress.levelThreeBestStars,
      status: progress.levelThreeUnlocked ? "playable" : "locked",
      unlockHint: progress.levelThreeUnlocked ? undefined : "第 2 关获得 1 星后解锁",
    },
    {
      id: LEVEL_FOUR.id,
      title: LEVEL_FOUR.title,
      subtitle: LEVEL_FOUR.subtitle,
      bestScore: progress.levelFourBestScore,
      bestStars: progress.levelFourBestStars,
      status: progress.levelFourUnlocked ? "playable" : "locked",
      unlockHint: progress.levelFourUnlocked ? undefined : "第 3 关获得 1 星后解锁",
    },
    {
      id: LEVEL_FIVE.id,
      title: LEVEL_FIVE.title,
      subtitle: LEVEL_FIVE.subtitle,
      bestScore: progress.levelFiveBestScore,
      bestStars: progress.levelFiveBestStars,
      status: progress.levelFiveUnlocked ? "playable" : "locked",
      unlockHint: progress.levelFiveUnlocked ? undefined : "第 4 关获得 1 星后解锁",
    },
    {
      id: LEVEL_SIX.id,
      title: LEVEL_SIX.title,
      subtitle: LEVEL_SIX.subtitle,
      bestScore: progress.levelSixBestScore,
      bestStars: progress.levelSixBestStars,
      status: progress.levelSixUnlocked ? "playable" : "locked",
      unlockHint: progress.levelSixUnlocked ? undefined : "第 5 关获得 1 星后解锁",
    },
  ];
}
