import type { IngredientKind } from "./levelOneRules.ts";

export function recipeMatches(
  actual: readonly IngredientKind[],
  expected: readonly IngredientKind[],
): boolean {
  if (actual.length !== expected.length) return false;
  return [...actual].sort().join("|") === [...expected].sort().join("|");
}

export function findMatchingOrderIndex(
  actual: readonly IngredientKind[],
  orders: readonly (readonly IngredientKind[])[],
): number | null {
  const index = orders.findIndex((recipe) => recipeMatches(actual, recipe));
  return index >= 0 ? index : null;
}
