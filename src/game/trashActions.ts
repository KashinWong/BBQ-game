export type DiscardableSkewerLocation = "prep" | "tray" | "grill" | "dragging";

export type DiscardAction = "remove-last-piece" | "discard-whole";

export function discardActionForSkewer(
  location: DiscardableSkewerLocation,
  heldForFullDiscard: boolean,
): DiscardAction {
  return location === "prep" && !heldForFullDiscard ? "remove-last-piece" : "discard-whole";
}
