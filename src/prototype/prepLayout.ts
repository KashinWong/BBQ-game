export function buildIngredientLaneYs(prepY: number, prepHeight: number, laneCount: number): number[] {
  const top = prepY + 50;
  const bottom = Math.max(top, prepY + prepHeight - 115);
  return Array.from(
    { length: laneCount },
    (_, lane) => top + ((bottom - top) / Math.max(1, laneCount - 1)) * lane,
  );
}
