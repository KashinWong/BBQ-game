export interface GrillSlotPosition {
  x: number;
  y: number;
}

const TWO_SLOT_LAYOUT: readonly GrillSlotPosition[] = [
  { x: 195, y: 284 },
  { x: 195, y: 390 },
];

const THREE_SLOT_LAYOUT: readonly GrillSlotPosition[] = [
  { x: 195, y: 258 },
  { x: 195, y: 327 },
  { x: 195, y: 396 },
];

export function buildGrillSlots(count: 2 | 3): GrillSlotPosition[] {
  return (count === 3 ? THREE_SLOT_LAYOUT : TWO_SLOT_LAYOUT).map((slot) => ({ ...slot }));
}
