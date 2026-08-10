import assert from "node:assert/strict";
import test from "node:test";
import { ingredientPositionAt } from "./ingredientMotion.ts";

test("moving prep ingredients travel horizontally and wrap inside the rack", () => {
  const start = ingredientPositionAt({
    homeX: 60,
    homeY: 600,
    phase: 0,
    direction: 1,
    timeSeconds: 0,
    speed: 18,
    swayAmplitude: 0,
    minX: 42,
    maxX: 348,
  });
  const later = ingredientPositionAt({
    homeX: 60,
    homeY: 600,
    phase: 0,
    direction: 1,
    timeSeconds: 20,
    speed: 18,
    swayAmplitude: 0,
    minX: 42,
    maxX: 348,
  });

  assert.equal(start.y, 600);
  assert.notEqual(later.x, start.x);
  assert.ok(later.x >= 42 && later.x <= 348);
});

test("the two prep rows can move in opposite directions", () => {
  const base = {
    homeX: 195,
    homeY: 600,
    phase: 0,
    timeSeconds: 2,
    speed: 18,
    swayAmplitude: 0,
    minX: 42,
    maxX: 348,
  } as const;
  const forward = ingredientPositionAt({ ...base, direction: 1 });
  const backward = ingredientPositionAt({ ...base, direction: -1 });

  assert.ok(forward.x > base.homeX);
  assert.ok(backward.x < base.homeX);
});
