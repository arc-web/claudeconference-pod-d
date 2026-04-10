import { create } from 'zustand';
import db from '../db/database';

const useAppStore = create((set, get) => ({
  isInitialized: false,
  onboardingStep: 0,
  theme: 'system',
  isOnboardingComplete: false,

  initialize: async () => {
    const onboardingSetting = await db.settings.where('key').equals('onboarding_completed').first();
    const themeSetting = await db.settings.where('key').equals('theme').first();

    set({
      isOnboardingComplete: onboardingSetting?.value === true,
      theme: themeSetting?.value || 'system',
      isInitialized: true
    });

    const theme = themeSetting?.value || 'system';
    applyTheme(theme);
  },

  setOnboardingStep: (step) => {
    set({ onboardingStep: step });
  },

  completeOnboarding: async () => {
    set({ isOnboardingComplete: true });
    const existing = await db.settings.where('key').equals('onboarding_completed').first();
    if (existing) {
      await db.settings.update(existing.id, { value: true });
    } else {
      await db.settings.add({ key: 'onboarding_completed', value: true });
    }
  },

  setTheme: async (theme) => {
    set({ theme });
    applyTheme(theme);
    const existing = await db.settings.where('key').equals('theme').first();
    if (existing) {
      await db.settings.update(existing.id, { value: theme });
    } else {
      await db.settings.add({ key: 'theme', value: theme });
    }
  },

  setSetting: async (key, value) => {
    const existing = await db.settings.where('key').equals(key).first();
    if (existing) {
      await db.settings.update(existing.id, { value });
    } else {
      await db.settings.add({ key, value });
    }
  },

  getSetting: async (key, defaultValue = null) => {
    const setting = await db.settings.where('key').equals(key).first();
    return setting?.value ?? defaultValue;
  }
}));

function applyTheme(theme) {
  const root = document.documentElement;
  root.removeAttribute('data-theme');

  if (theme === 'light' || theme === 'dark') {
    root.setAttribute('data-theme', theme);
  }
}

export default useAppStore;
