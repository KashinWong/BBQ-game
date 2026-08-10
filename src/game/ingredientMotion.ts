export interface IngredientMotionInput {
  homeX: number;
  homeY: number;
  phase: number;
  direction: -1 | 1;
  timeSeconds: number;
  speed: number;
  swayAmplitude: number;
  minX: number;
  maxX: number;
}

export interface IngredientPosition {
  x: number;
  y: number;
}

export function ingredientPositionAt(input: IngredientMotionInput): IngredientPosition {
  if (input.speed > 0) {
    const span = Math.max(1, input.maxX - input.minX);
    const travelled = input.homeX - input.minX + input.direction * input.timeSeconds * input.speed;
    const wrapped = ((travelled % span) + span) % span;
    return { x: input.minX + wrapped, y: input.homeY };
  }

  if (input.swayAmplitude > 0) {
    const wave = input.timeSeconds / 1.15 + input.phase;
    return {
      x: input.homeX + Math.sin(wave) * input.swayAmplitude,
      y: input.homeY + Math.cos(wave * 0.8) * 2,
    };
  }

  return { x: input.homeX, y: input.homeY };
}
