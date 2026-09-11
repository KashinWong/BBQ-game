import type { StoragePort } from "./progress.ts";

const STORAGE_KEY = "bbq-master.settings.v1";

export interface GameSettings {
  musicEnabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

export function defaultGameSettings(): GameSettings {
  return {
    musicEnabled: true,
    soundEnabled: true,
    vibrationEnabled: true,
  };
}

export class GameSettingsStore {
  private current: GameSettings;

  constructor(private readonly storage?: StoragePort) {
    this.current = storage ? loadGameSettings(storage) : defaultGameSettings();
  }

  get(): GameSettings {
    return { ...this.current };
  }

  update(patch: Partial<GameSettings>): GameSettings {
    this.current = {
      musicEnabled: typeof patch.musicEnabled === "boolean" ? patch.musicEnabled : this.current.musicEnabled,
      soundEnabled: typeof patch.soundEnabled === "boolean" ? patch.soundEnabled : this.current.soundEnabled,
      vibrationEnabled: typeof patch.vibrationEnabled === "boolean" ? patch.vibrationEnabled : this.current.vibrationEnabled,
    };
    if (this.storage) saveGameSettings(this.storage, this.current);
    return this.get();
  }
}

export function loadGameSettings(storage: StoragePort): GameSettings {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return defaultGameSettings();
    const saved = JSON.parse(raw) as Partial<GameSettings>;
    const defaults = defaultGameSettings();
    return {
      musicEnabled: typeof saved.musicEnabled === "boolean" ? saved.musicEnabled : defaults.musicEnabled,
      soundEnabled: typeof saved.soundEnabled === "boolean" ? saved.soundEnabled : defaults.soundEnabled,
      vibrationEnabled: typeof saved.vibrationEnabled === "boolean" ? saved.vibrationEnabled : defaults.vibrationEnabled,
    };
  } catch {
    return defaultGameSettings();
  }
}

function saveGameSettings(storage: StoragePort, settings: GameSettings): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Settings still apply for this session when browser storage is unavailable.
  }
}
