import assert from "node:assert/strict";
import test from "node:test";
import { findMatchingOrderIndex } from "./orderQueue.ts";

test("a completed skewer can be routed to the matching one of two orders", () => {
  const orders = [
    ["chicken", "corn", "sausage"],
    ["beef", "beef", "sausage"],
  ] as const;

  assert.equal(findMatchingOrderIndex(["sausage", "beef", "beef"], orders), 1);
  assert.equal(findMatchingOrderIndex(["corn", "corn"], orders), null);
});
