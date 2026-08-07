export type TutorialStep =
  | "select-food"
  | "place-on-grill"
  | "cook-first-side"
  | "flip"
  | "cook-second-side"
  | "serve"
  | "score-explained"
  | "complete";

export type TutorialEvent =
  | "recipe-complete"
  | "placed-on-grill"
  | "first-side-ready"
  | "flipped"
  | "both-sides-ready"
  | "served"
  | "continued";

const TRANSITIONS: Partial<Record<TutorialStep, Partial<Record<TutorialEvent, TutorialStep>>>> = {
  "select-food": { "recipe-complete": "place-on-grill" },
  "place-on-grill": { "placed-on-grill": "cook-first-side" },
  "cook-first-side": { "first-side-ready": "flip" },
  flip: { flipped: "cook-second-side" },
  "cook-second-side": { "both-sides-ready": "serve" },
  serve: { served: "score-explained" },
  "score-explained": { continued: "complete" },
};

export function advanceTutorial(current: TutorialStep, event: TutorialEvent): TutorialStep {
  return TRANSITIONS[current]?.[event] ?? current;
}
