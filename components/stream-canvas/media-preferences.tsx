"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

interface PreviewPreference {
  enabled: boolean;
  volume: number;
}

type StoredPreferences = Record<string, PreviewPreference>;

interface StoredPreferenceState {
  storageKey: string | null;
  preferences: StoredPreferences;
}

interface MediaPreferencesContextValue {
  getPreference(mediaId: string): PreviewPreference;
  setEnabled(mediaId: string, enabled: boolean): void;
  setVolume(mediaId: string, volume: number): void;
}

const DEFAULT_PREFERENCE: PreviewPreference = { enabled: false, volume: 1 };

const MediaPreferencesContext = createContext<MediaPreferencesContextValue>({
  getPreference: () => DEFAULT_PREFERENCE,
  setEnabled: () => {},
  setVolume: () => {},
});

export function MediaPreferencesProvider({
  children,
  roomId,
  userId,
}: {
  children: ReactNode;
  roomId: string;
  userId: string | null | undefined;
}) {
  const storageKey = getMediaPreferencesStorageKey(userId, roomId);
  const persistenceFailed = useRef(false);
  const [storedState, setStoredState] = useState<StoredPreferenceState>({
    storageKey: null,
    preferences: {},
  });

  useEffect(() => {
    if (!storageKey) {
      setStoredState({ storageKey: null, preferences: {} });
      return;
    }
    try {
      const stored = window.localStorage.getItem(storageKey);
      setStoredState({
        storageKey,
        preferences: stored ? parsePreferences(JSON.parse(stored)) : {},
      });
    } catch {
      setStoredState({ storageKey, preferences: {} });
    }
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey || storedState.storageKey !== storageKey) return;
    if (persistenceFailed.current) return;
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify(storedState.preferences),
      );
    } catch {
      // Preview preferences remain usable in memory when storage is unavailable.
      persistenceFailed.current = true;
    }
  }, [storageKey, storedState]);

  const getPreference = useCallback(
    (mediaId: string) =>
      storedState.storageKey === storageKey
        ? (storedState.preferences[mediaId] ?? DEFAULT_PREFERENCE)
        : DEFAULT_PREFERENCE,
    [storageKey, storedState],
  );
  const setEnabled = useCallback(
    (mediaId: string, enabled: boolean) => {
      setStoredState((current) => {
        const preferences =
          current.storageKey === storageKey ? current.preferences : {};
        return {
          storageKey,
          preferences: {
            ...preferences,
            [mediaId]: {
              ...(preferences[mediaId] ?? DEFAULT_PREFERENCE),
              enabled,
            },
          },
        };
      });
    },
    [storageKey],
  );
  const setVolume = useCallback(
    (mediaId: string, volume: number) => {
      setStoredState((current) => {
        const preferences =
          current.storageKey === storageKey ? current.preferences : {};
        return {
          storageKey,
          preferences: {
            ...preferences,
            [mediaId]: {
              ...(preferences[mediaId] ?? DEFAULT_PREFERENCE),
              volume: Math.max(0, Math.min(1, volume)),
            },
          },
        };
      });
    },
    [storageKey],
  );

  const value = useMemo(
    () => ({ getPreference, setEnabled, setVolume }),
    [getPreference, setEnabled, setVolume],
  );

  return (
    <MediaPreferencesContext.Provider value={value}>
      {children}
    </MediaPreferencesContext.Provider>
  );
}

export function useMediaPreference(mediaId: string) {
  const context = useContext(MediaPreferencesContext);
  const preference = context.getPreference(mediaId);
  return {
    ...preference,
    setEnabled: (enabled: boolean) => context.setEnabled(mediaId, enabled),
    setVolume: (volume: number) => context.setVolume(mediaId, volume),
  };
}

export function getMediaPreferencesStorageKey(
  userId: string | null | undefined,
  roomId: string,
): string | null {
  return userId ? `moddrop:media-preferences:v1:${userId}:${roomId}` : null;
}

export function parsePreferences(value: unknown): StoredPreferences {
  if (!value || typeof value !== "object") return {};
  const result: StoredPreferences = {};
  for (const [key, preference] of Object.entries(value)) {
    if (!preference || typeof preference !== "object") continue;
    const enabled = "enabled" in preference && preference.enabled === true;
    const volume =
      "volume" in preference && typeof preference.volume === "number"
        ? Math.max(0, Math.min(1, preference.volume))
        : 1;
    result[key] = { enabled, volume };
  }
  return result;
}
