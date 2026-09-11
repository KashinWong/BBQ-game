import assert from "node:assert/strict";
import test from "node:test";
import { BrowserFeedback } from "./BrowserFeedback.ts";
import type { GameSettings } from "../game/settings.ts";

function settings(patch: Partial<GameSettings> = {}): GameSettings {
  return {
    musicEnabled: true,
    soundEnabled: true,
    vibrationEnabled: true,
    ...patch,
  };
}

class FakeAudioContext {
  state: AudioContextState = "running";
  currentTime = 0;
  destination = {} as AudioDestinationNode;
  oscillators: FakeOscillator[] = [];

  createOscillator(): OscillatorNode {
    const oscillator = new FakeOscillator();
    this.oscillators.push(oscillator);
    return oscillator as unknown as OscillatorNode;
  }

  createGain(): GainNode {
    return new FakeGain() as unknown as GainNode;
  }

  async resume(): Promise<void> {}
}

class FakeOscillator {
  type: OscillatorType = "sine";
  frequency = {
    setValueAtTime(): void {},
  };

  connect(): FakeGain {
    return new FakeGain();
  }

  start(): void {}

  stop(): void {}
}

class FakeGain {
  gain = {
    setValueAtTime(): void {},
    exponentialRampToValueAtTime(): void {},
  };

  connect(): FakeGain {
    return this;
  }
}

test("disabled sound never creates a browser audio context", () => {
  let contextsCreated = 0;
  const feedback = new BrowserFeedback(
    () => settings({ soundEnabled: false }),
    {
      createAudioContext: () => {
        contextsCreated += 1;
        return new FakeAudioContext() as unknown as AudioContext;
      },
    },
  );

  feedback.play("pickup");
  assert.equal(contextsCreated, 0);
});

test("enabled sound emits the cue's oscillator sequence", () => {
  const audio = new FakeAudioContext();
  const feedback = new BrowserFeedback(
    () => settings(),
    { createAudioContext: () => audio as unknown as AudioContext },
  );

  feedback.play("flip");
  assert.equal(audio.oscillators.length, 2);
});

test("vibration calls are suppressed only when vibration is disabled", () => {
  const durations: number[] = [];
  const environment = { vibrate: (duration: number) => durations.push(duration) };

  new BrowserFeedback(() => settings({ vibrationEnabled: false }), environment).vibrate(25);
  new BrowserFeedback(() => settings(), environment).vibrate(35);

  assert.deepEqual(durations, [35]);
});
