export interface CookTimeDefinition {
  cookSeconds: number;
}

export function calculateOrderPatienceSeconds(
  recipe: string[],
  definitions: Record<string, CookTimeDefinition>,
): number {
  const slowestSingleSide = recipe.reduce(
    (slowest, kind) => Math.max(slowest, definitions[kind]?.cookSeconds ?? 0),
    0,
  );
  const baseBuffer = 16;
  const pickupBudget = recipe.length * 3;
  const doubleSidedCookingBudget = slowestSingleSide * 2.5;
  return Math.max(32, Math.ceil(baseBuffer + pickupBudget + doubleSidedCookingBudget));
}
