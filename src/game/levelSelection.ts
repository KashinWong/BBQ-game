import { LEVEL_ONE, LEVEL_TWO } from "./levelOneRules.ts";
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
    ...Array.from({ length: 4 }, (_, index): LevelCard => ({
      id: index + 3,
      title: `第 ${index + 3} 关`,
      subtitle: "新摊位筹备中",
      bestScore: 0,
      bestStars: 0,
      status: "coming-soon",
      unlockHint: "后续开放",
    })),
  ];
}
