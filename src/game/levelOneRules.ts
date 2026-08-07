export type IngredientKind = "beef" | "pepper" | "mushroom";

export interface LevelOneConfig {
  durationSeconds: number;
  starScores: readonly [number, number, number];
  grillSlots: number;
  ingredientSpeed: number;
  pauseTimersDuringTutorial: boolean;
  recipes: readonly (readonly IngredientKind[])[];
}

export const LEVEL_ONE: LevelOneConfig = {
  durationSeconds: 90,
  starScores: [600, 1000, 1400],
  grillSlots: 2,
  ingredientSpeed: 0,
  pauseTimersDuringTutorial: true,
  recipes: [
    ["mushroom", "beef"],
    ["pepper", "mushroom"],
  ],
};

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

export function starsForScore(score: number): 0 | 1 | 2 | 3 {
  if (score >= LEVEL_ONE.starScores[2]) return 3;
  if (score >= LEVEL_ONE.starScores[1]) return 2;
  if (score >= LEVEL_ONE.starScores[0]) return 1;
  return 0;
}
