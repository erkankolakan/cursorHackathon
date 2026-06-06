// ─── Design Token: Colors ─────────────────────────────────────────────────────

const palette = {
  // Primary — Violet/Indigo
  primary50: '#EEF2FF',
  primary100: '#E0E7FF',
  primary200: '#C7D2FE',
  primary300: '#A5B4FC',
  primary400: '#818CF8',
  primary500: '#6366F1',
  primary600: '#4F46E5',
  primary700: '#4338CA',
  primary800: '#3730A3',
  primary900: '#312E81',

  // Accent — Cyan
  accent400: '#22D3EE',
  accent500: '#06B6D4',
  accent600: '#0891B2',

  // Success
  success400: '#4ADE80',
  success500: '#22C55E',

  // Warning
  warning400: '#FACC15',
  warning500: '#EAB308',

  // Error
  error400: '#F87171',
  error500: '#EF4444',

  // Neutrals
  white: '#FFFFFF',
  black: '#000000',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',

  // Dark backgrounds
  dark900: '#0A0F1E',
  dark800: '#0F172A',
  dark700: '#1E293B',
  dark600: '#334155',
} as const;

export const Colors = {
  light: {
    text: palette.gray900,
    textSecondary: palette.gray500,
    textMuted: palette.gray400,
    background: palette.white,
    backgroundSecondary: palette.gray50,
    surface: palette.white,
    surfaceElevated: palette.gray100,
    border: palette.gray200,
    borderStrong: palette.gray300,
    primary: palette.primary500,
    primaryLight: palette.primary100,
    accent: palette.accent500,
    success: palette.success500,
    warning: palette.warning500,
    error: palette.error500,
    tabIconDefault: palette.gray400,
    tabIconSelected: palette.primary500,
  },
  dark: {
    text: palette.white,
    textSecondary: palette.gray300,
    textMuted: palette.gray500,
    background: palette.dark900,
    backgroundSecondary: palette.dark800,
    surface: palette.dark700,
    surfaceElevated: palette.dark600,
    border: palette.dark600,
    borderStrong: palette.gray600,
    primary: palette.primary400,
    primaryLight: palette.primary900,
    accent: palette.accent400,
    success: palette.success400,
    warning: palette.warning400,
    error: palette.error400,
    tabIconDefault: palette.gray500,
    tabIconSelected: palette.primary400,
  },
  palette,
} as const;

export type ThemeColors = typeof Colors.light;
