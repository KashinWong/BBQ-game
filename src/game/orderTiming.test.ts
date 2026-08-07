import assert from "node:assert/strict";
import test from "node:test";
import { calculateOrderPatienceSeconds } from "./orderTiming.ts";

const food = {
  beef: { cookSeconds: 5 },
  pepper: { cookSeconds: 3.5 },
  mushroom: { cookSeconds: 4 },
};

test("order patience includes pickup, double-sided cooking and a comfort buffer", () => {
  assert.equal(calculateOrderPatienceSeconds(["beef", "pepper"], food), 35);
  assert.equal(calculateOrderPatienceSeconds(["beef", "pepper", "mushroom"], food), 38);
});

test("slower or larger orders receive more patience", () => {
  const quickTwo = calculateOrderPatienceSeconds(["pepper", "mushroom"], food);
  const slowThree = calculateOrderPatienceSeconds(["beef", "beef", "pepper"], food);
  assert.ok(quickTwo >= 32);
  assert.ok(slowThree > quickTwo);
});
