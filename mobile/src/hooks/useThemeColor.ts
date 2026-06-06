// ─── useThemeColor Hook ───────────────────────────────────────────────────────
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/Colors';
import type { ThemeColors } from '@/constants/Colors';

type SchemeKey = 'light' | 'dark';

function resolveScheme(scheme: ReturnType<typeof useColorScheme>): SchemeKey {
  if (scheme === 'dark') return 'dark';
  return 'light';
}

export function useThemeColor<T extends keyof ThemeColors>(
  colorName: T,
  overrides?: { light?: string; dark?: string }
): string {
  const raw = useColorScheme();
  const scheme = resolveScheme(raw);
  if (overrides?.light && scheme === 'light') return overrides.light;
  if (overrides?.dark && scheme === 'dark') return overrides.dark;
  return Colors[scheme][colorName] as string;
}

export function useColors(): ThemeColors {
  const raw = useColorScheme();
  return Colors[resolveScheme(raw)] as ThemeColors;
}

export function useIsDark(): boolean {
  return useColorScheme() === 'dark';
}
