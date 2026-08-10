import assert from "node:assert/strict";
import test from "node:test";
import { buildGrillSlots } from "./grillLayout.ts";

test("three grill slots fit vertically with non-overlapping compact touch zones", () => {
  const slots = buildGrillSlots(3);
  assert.equal(slots.length, 3);
  assert.ok(slots.every(({ x }) => x === 195));
  assert.ok(slots.slice(1).every((slot, index) => slot.y - slots[index].y >= 68));
  assert.ok(slots[0].y - 32 >= 202);
  assert.ok(slots[2].y + 32 <= 452);
});
