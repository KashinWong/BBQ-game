import assert from "node:assert/strict";
import test from "node:test";
import { buildLevelOneIngredientRack } from "./prepLayout.ts";

test("level one starts with two visible portions of every ingredient", () => {
  const rack = buildLevelOneIngredientRack(
    { x: 15, y: 540, width: 360, height: 245 },
    748,
  );
  assert.equal(rack.length, 6);
  assert.equal(rack.filter(({ kind }) => kind === "beef").length, 2);
  assert.equal(rack.filter(({ kind }) => kind === "pepper").length, 2);
  assert.equal(rack.filter(({ kind }) => kind === "mushroom").length, 2);
  assert.equal(new Set(rack.map(({ x, y }) => `${x}:${y}`)).size, rack.length);
  assert.ok(Math.max(...rack.map(({ y }) => y)) <= 748 - 72);
});
