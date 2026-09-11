import assert from "node:assert/strict";
import test from "node:test";
import { GameSettingsStore } from "./settings.ts";

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

test("settings default to enabled and persist an immediate toggle", () => {
  const storage = new MemoryStorage();
  const settings = new GameSettingsStore(storage);

  assert.deepEqual(settings.get(), {
    musicEnabled: true,
    soundEnabled: true,
    vibrationEnabled: true,
  });

  assert.deepEqual(settings.update({ soundEnabled: false }), {
    musicEnabled: true,
    soundEnabled: false,
    vibrationEnabled: true,
  });

  assert.deepEqual(new GameSettingsStore(storage).get(), {
    musicEnabled: true,
    soundEnabled: false,
    vibrationEnabled: true,
  });
});

test("settings fall back to defaults when saved data is corrupt or inaccessible", () => {
  const corruptStorage = new MemoryStorage();
  corruptStorage.setItem("bbq-master.settings.v1", "{not-json");
  assert.deepEqual(new GameSettingsStore(corruptStorage).get(), {
    musicEnabled: true,
    soundEnabled: true,
    vibrationEnabled: true,
  });

  const unavailableStorage = {
    getItem(): string | null {
      throw new Error("storage unavailable");
    },
    setItem(): void {},
  };
  assert.deepEqual(new GameSettingsStore(unavailableStorage).get(), {
    musicEnabled: true,
    soundEnabled: true,
    vibrationEnabled: true,
  });
});

test("settings changes remain available for the session when persistence fails", () => {
  const unavailableStorage = {
    getItem(): string | null {
      return null;
    },
    setItem(): void {
      throw new Error("storage quota exceeded");
    },
  };
  const settings = new GameSettingsStore(unavailableStorage);

  assert.deepEqual(settings.update({ vibrationEnabled: false }), {
    musicEnabled: true,
    soundEnabled: true,
    vibrationEnabled: false,
  });
});
