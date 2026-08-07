export type IngredientKind = "beef" | "pepper" | "mushroom" | "sausage";
export type LevelId = 1 | 2;

export interface LevelOneConfig {
  id: LevelId;
  title: string;
  subtitle: string;
  durationSeconds: number;
  starScores: readonly [number, number, number];
  grillSlots: number;
  ingredientSpeed: number;
  ingredientMotionAmplitude: number;
  ingredientKinds: readonly IngredientKind[];
  pauseTimersDuringTutorial: boolean;
  tutorial: boolean;
  recipes: readonly (readonly IngredientKind[])[];
}

export const LEVEL_ONE: LevelOneConfig = {
  id: 1,
  title: "夜市初营业",
  subtitle: "掌握选料、翻面与出餐",
  durationSeconds: 90,
  starScores: [600, 1000, 1400],
  grillSlots: 2,
  ingredientSpeed: 0,
  ingredientMotionAmplitude: 0,
  ingredientKinds: ["beef", "pepper", "mushroom"],
  pauseTimersDuringTutorial: true,
  tutorial: true,
  recipes: [
    ["mushroom", "beef"],
    ["pepper", "mushroom"],
  ],
};

export const LEVEL_TWO: LevelOneConfig = {
  id: 2,
  title: "晚市加单",
  subtitle: "香肠登场，食材开始轻轻移动",
  durationSeconds: 90,
  starScores: [900, 1400, 1900],
  grillSlots: 2,
  ingredientSpeed: 0,
  ingredientMotionAmplitude: 12,
  ingredientKinds: ["beef", "pepper", "mushroom", "sausage"],
  pauseTimersDuringTutorial: false,
  tutorial: false,
  recipes: [
    ["sausage", "beef"],
    ["sausage", "mushroom"],
    ["pepper", "mushroom"],
    ["sausage", "beef", "mushroom"],
  ],
};

export const PLAYABLE_LEVELS = [LEVEL_ONE, LEVEL_TWO] as const;

export function getLevelConfig(levelId: number): LevelOneConfig {
  return levelId === LEVEL_TWO.id ? LEVEL_TWO : LEVEL_ONE;
}

export const LEVEL_ONE_DONENESS = {
  perfectMin: 70,
  perfectMax: 115,
  burntMin: 125,
} as const;

export function isPerfectDoneness(value: number): boolean {
  return value >= LEVEL_ONE_DONENESS.perfectMin && value <= LEVEL_ONE_DONENESS.perfectMax;
}

export interface CookedPiece {
  kind: IngredientKind;
  sides: readonly [number, number];
}

export interface ServiceRequest {
  expectedRecipe: readonly IngredientKind[];
  pieces: readonly CookedPiece[];
  patienceRatio: number;
  comboBefore: number;
}

export type ServiceResult =
  | {
      accepted: true;
      earnedScore: number;
      comboAfter: number;
      perfect: boolean;
      quality: "perfect" | "good" | "poor";
    }
  | {
      accepted: false;
      scorePenalty: 50;
      comboAfter: 0;
      reason: "wrong-recipe" | "raw";
    };

function sameRecipe(actual: readonly IngredientKind[], expected: readonly IngredientKind[]): boolean {
  if (actual.length !== expected.length) return false;
  return [...actual].sort().join("|") === [...expected].sort().join("|");
}

function qualityMultiplier(piece: CookedPiece): number {
  const [sideA, sideB] = piece.sides;
  if (sideA >= LEVEL_ONE_DONENESS.burntMin || sideB >= LEVEL_ONE_DONENESS.burntMin) return 0.15;
  if (sideA < 40 || sideB < 40 || sideA > LEVEL_ONE_DONENESS.perfectMax || sideB > LEVEL_ONE_DONENESS.perfectMax) return 0.4;
  if (isPerfectDoneness(sideA) && isPerfectDoneness(sideB)) return 1;
  return 0.75;
}

export function evaluateService(request: ServiceRequest): ServiceResult {
  if (!sameRecipe(request.pieces.map(({ kind }) => kind), request.expectedRecipe)) {
    return { accepted: false, scorePenalty: 50, comboAfter: 0, reason: "wrong-recipe" };
  }
  if (request.pieces.some(({ sides }) => sides.some((side) => side < 20))) {
    return { accepted: false, scorePenalty: 50, comboAfter: 0, reason: "raw" };
  }

  const multipliers = request.pieces.map(qualityMultiplier);
  const perfect = multipliers.every((multiplier) => multiplier === 1);
  const poor = multipliers.some((multiplier) => multiplier <= 0.4);
  const comboAfter = poor ? 0 : request.comboBefore + 1;
  const foodScore = multipliers.reduce((sum, multiplier) => sum + 100 * multiplier, 0);
  const speedScore = 150 * Math.max(0, Math.min(1, request.patienceRatio));
  const comboMultiplier = Math.min(1.5, 1 + comboAfter * 0.1);

  return {
    accepted: true,
    earnedScore: Math.round((foodScore + speedScore) * comboMultiplier),
    comboAfter,
    perfect,
    quality: perfect ? "perfect" : poor ? "poor" : "good",
  };
}

export function starsForScore(score: number, level: LevelOneConfig = LEVEL_ONE): 0 | 1 | 2 | 3 {
  if (score >= level.starScores[2]) return 3;
  if (score >= level.starScores[1]) return 2;
  if (score >= level.starScores[0]) return 1;
  return 0;
}
