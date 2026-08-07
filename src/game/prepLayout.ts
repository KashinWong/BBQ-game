import type { IngredientKind } from "./levelOneRules";

interface PrepRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface IngredientRackSlot {
  kind: IngredientKind;
  x: number;
  y: number;
}

export function buildIngredientRack(
  prep: PrepRect,
  skewerY: number,
  kinds: readonly IngredientKind[],
): IngredientRackSlot[] {
  const edgePadding = kinds.length >= 4 ? 54 : 70;
  const left = prep.x + edgePadding;
  const right = prep.x + prep.width - edgePadding;
  const top = prep.y + 60;
  const bottom = Math.min(prep.y + prep.height - 125, skewerY - 88);

  return [top, bottom].flatMap((y) => kinds.map((kind, column) => ({
    kind,
    x: kinds.length === 1 ? prep.x + prep.width / 2 : left + ((right - left) / (kinds.length - 1)) * column,
    y,
  })));
}

export function buildLevelOneIngredientRack(prep: PrepRect, skewerY: number): IngredientRackSlot[] {
  return buildIngredientRack(prep, skewerY, ["beef", "pepper", "mushroom"]);
}
