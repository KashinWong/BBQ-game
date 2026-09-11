import { GameSettingsStore } from "./settings.ts";

export function createBrowserSettingsStore(): GameSettingsStore {
  try {
    return new GameSettingsStore(window.localStorage);
  } catch {
    return new GameSettingsStore();
  }
}
