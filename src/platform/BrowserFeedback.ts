export type FeedbackCue = "pickup" | "place" | "flip" | "perfect" | "success" | "warning" | "goal";

const FREQUENCIES: Record<FeedbackCue, readonly number[]> = {
  pickup: [520, 720],
  place: [240],
  flip: [380, 520],
  perfect: [660, 830, 990],
  success: [520, 660],
  warning: [180, 150],
  goal: [523, 659, 784, 1047],
};

export class BrowserFeedback {
  private context?: AudioContext;

  unlock(): void {
    try {
      this.context ??= new AudioContext();
      if (this.context.state === "suspended") void this.context.resume();
    } catch {
      this.context = undefined;
    }
  }

  play(cue: FeedbackCue): void {
    this.unlock();
    const context = this.context;
    if (!context || context.state === "closed") return;
    const now = context.currentTime;
    FREQUENCIES[cue].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = now + index * 0.075;
      oscillator.type = cue === "warning" ? "square" : "sine";
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.055, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.11);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.12);
    });
  }

  vibrate(duration = 18): void {
    try {
      navigator.vibrate?.(duration);
    } catch {
      // Vibration is optional and may be blocked by the browser.
    }
  }
}
