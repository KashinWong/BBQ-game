import assert from "node:assert/strict";
import test from "node:test";
import { discardActionForSkewer } from "./trashActions.ts";

test("a prep skewer removes only its last piece unless held for a full discard", () => {
  assert.equal(discardActionForSkewer("prep", false), "remove-last-piece");
  assert.equal(discardActionForSkewer("prep", true), "discard-whole");
});

test("tray and grill skewers are always discarded whole", () => {
  assert.equal(discardActionForSkewer("tray", false), "discard-whole");
  assert.equal(discardActionForSkewer("tray", true), "discard-whole");
  assert.equal(discardActionForSkewer("grill", false), "discard-whole");
  assert.equal(discardActionForSkewer("grill", true), "discard-whole");
  assert.equal(discardActionForSkewer("dragging", false), "discard-whole");
});
