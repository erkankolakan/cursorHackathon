// ─── Card Component ───────────────────────────────────────────────────────────
import { View, StyleSheet, type ViewProps } from 'react-native';
import { useColors } from '@/hooks/useThemeColor';
import { BorderRadius, Shadow, Spacing } from '@/constants/Layout';

interface CardProps extends ViewProps {
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: keyof typeof Spacing;
}

export function Card({
  children,
  variant = 'default',
  padding = 'base',
  style,
  ...rest
}: CardProps) {
  const colors = useColors();

  const variantStyles = {
    default: {
      backgroundColor: colors.surface,
      borderWidth: 0,
    },
    elevated: {
      backgroundColor: colors.surface,
      ...Shadow.md,
      borderWidth: 0,
    },
    outlined: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
  };

  return (
    <View
      style={[
        styles.card,
        variantStyles[variant],
        { padding: Spacing[padding], borderRadius: BorderRadius.lg },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
});
