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

export function buildLevelOneIngredientRack(prep: PrepRect, skewerY: number): IngredientRackSlot[] {
  const kinds: IngredientKind[] = ["beef", "pepper", "mushroom"];
  const left = prep.x + 70;
  const right = prep.x + prep.width - 70;
  const top = prep.y + 60;
  const bottom = Math.min(prep.y + prep.height - 125, skewerY - 88);

  return [top, bottom].flatMap((y) => kinds.map((kind, column) => ({
    kind,
    x: left + ((right - left) / (kinds.length - 1)) * column,
    y,
  })));
}
