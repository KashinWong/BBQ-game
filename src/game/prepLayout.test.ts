import assert from "node:assert/strict";
import test from "node:test";
import { buildIngredientRack, buildLevelOneIngredientRack } from "./prepLayout.ts";

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

test("level two keeps two visible portions of all four ingredients", () => {
  const rack = buildIngredientRack(
    { x: 15, y: 540, width: 360, height: 245 },
    748,
    ["beef", "pepper", "mushroom", "sausage"],
  );
  assert.equal(rack.length, 8);
  for (const kind of ["beef", "pepper", "mushroom", "sausage"] as const) {
    assert.equal(rack.filter((slot) => slot.kind === kind).length, 2);
  }
  assert.equal(new Set(rack.map(({ x, y }) => `${x}:${y}`)).size, rack.length);
});

test("level four keeps six ingredient kinds visible without cramped centers", () => {
  const rack = buildIngredientRack(
    { x: 15, y: 540, width: 360, height: 245 },
    748,
    ["beef", "pepper", "mushroom", "sausage", "corn", "chicken"],
  );
  assert.equal(rack.length, 12);
  for (const kind of ["beef", "pepper", "mushroom", "sausage", "corn", "chicken"] as const) {
    assert.equal(rack.filter((slot) => slot.kind === kind).length, 2);
  }
  const topRow = rack.filter(({ y }) => y === rack[0].y).sort((a, b) => a.x - b.x);
  assert.ok(topRow.slice(1).every((slot, index) => slot.x - topRow[index].x >= 52));
  const trackMinX = 39;
  const trackMaxX = 351;
  const wrapGap = trackMaxX - topRow.at(-1)!.x + topRow[0].x - trackMinX;
  assert.ok(wrapGap >= 52);
});
