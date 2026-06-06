// ─── App Constants ─────────────────────────────────────────────────────────────

export const APP_NAME = 'HackathonIstanbul';
export const APP_VERSION = '1.0.0';

// Storage Keys (SecureStore)
export const STORAGE_KEYS = {
  AUTH_TOKEN: '@auth_token',
  USER_DATA: '@user_data',
  ONBOARDING_DONE: '@onboarding_done',
  THEME_PREFERENCE: '@theme_preference',
} as const;

// API
export const API_CONFIG = {
  BASE_URL: process.env.EXPO_PUBLIC_API_URL ?? 'https://api.example.com',
  TIMEOUT: 15_000,
  VERSION: 'v1',
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;
