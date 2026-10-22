/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';

export type BotSpeed = 'SLOW' | 'NORMAL' | 'FAST';
export type CardStyle = 'CLASSIC' | 'MODERN' | 'TRADITIONAL';
export type Language = 'AR' | 'EN';

export interface AppSettings {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  botSpeed: BotSpeed;
  cardStyle: CardStyle;
  language: Language;
}

export const DEFAULT_SETTINGS: AppSettings = {
  soundEnabled: true,
  vibrationEnabled: true,
  botSpeed: 'NORMAL',
  cardStyle: 'CLASSIC',
  language: 'AR',
};

const SETTINGS_STORAGE_KEY = 'ikout_settings_v1';

export function loadSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (err) {
    console.warn('Failed to load settings from localStorage:', err);
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: AppSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn('Failed to save settings to localStorage:', err);
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      saveSettings(next);
      return next;
    });
  }, []);

  const toggleSound = useCallback(() => {
    updateSettings({ soundEnabled: !settings.soundEnabled });
  }, [settings.soundEnabled, updateSettings]);

  const toggleVibration = useCallback(() => {
    updateSettings({ vibrationEnabled: !settings.vibrationEnabled });
  }, [settings.vibrationEnabled, updateSettings]);

  const setBotSpeed = useCallback(
    (botSpeed: BotSpeed) => {
      updateSettings({ botSpeed });
    },
    [updateSettings]
  );

  const setCardStyle = useCallback(
    (cardStyle: CardStyle) => {
      updateSettings({ cardStyle });
    },
    [updateSettings]
  );

  const setLanguage = useCallback(
    (language: Language) => {
      updateSettings({ language });
    },
    [updateSettings]
  );

  return {
    settings,
    updateSettings,
    toggleSound,
    toggleVibration,
    setBotSpeed,
    setCardStyle,
    setLanguage,
  };
}

/**
 * Haptic feedback hook that vibrates if supported and enabled, safely no-ops on web
 */
export function useHaptics(enabled: boolean = true) {
  const trigger = useCallback(
    (type: 'light' | 'medium' | 'heavy' | 'success' | 'error' = 'light') => {
      if (!enabled || typeof navigator === 'undefined' || !navigator.vibrate) {
        return;
      }
      try {
        switch (type) {
          case 'light':
            navigator.vibrate(15);
            break;
          case 'medium':
            navigator.vibrate(30);
            break;
          case 'heavy':
            navigator.vibrate(50);
            break;
          case 'success':
            navigator.vibrate([20, 40, 20]);
            break;
          case 'error':
            navigator.vibrate([40, 60, 40]);
            break;
        }
      } catch {
        // Safe no-op on platforms restricting vibration
      }
    },
    [enabled]
  );

  return { trigger };
}

/**
 * Screen keep-awake hook that requests wakeLock if supported, safely no-ops on unsupported browsers
 */
export function useKeepAwake(active: boolean = true) {
  useEffect(() => {
    if (!active || typeof navigator === 'undefined') return;

    let wakeLock: any = null;

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && (navigator as any).wakeLock) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch {
        // Safe no-op
      }
    };

    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !wakeLock) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock && wakeLock.release) {
        wakeLock.release().catch(() => {});
      }
    };
  }, [active]);
}

export default useSettings;
