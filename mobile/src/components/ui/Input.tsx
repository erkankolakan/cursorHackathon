// ─── Input Component ──────────────────────────────────────────────────────────
import { useState } from 'react';
import {
  TextInput,
  View,
  Text,
  Pressable,
  StyleSheet,
  type TextInputProps,
} from 'react-native';
import { useColors } from '@/hooks/useThemeColor';
import { BorderRadius, FontSize, Spacing } from '@/constants/Layout';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
}

export function Input({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  onRightIconPress,
  style,
  ...rest
}: InputProps) {
  const colors = useColors();
  const [isFocused, setIsFocused] = useState(false);

  const borderColor = error
    ? colors.error
    : isFocused
      ? colors.primary
      : colors.border;

  return (
    <View style={styles.container}>
      {label ? (
        <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      ) : null}

      <View
        style={[
          styles.inputWrapper,
          {
            borderColor,
            backgroundColor: colors.surface,
            borderRadius: BorderRadius.md,
            shadowColor: isFocused ? colors.primary : 'transparent',
            shadowOpacity: isFocused ? 0.15 : 0,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 2 },
          },
        ]}
      >
        {leftIcon ? <View style={styles.icon}>{leftIcon}</View> : null}

        <TextInput
          style={[
            styles.input,
            {
              color: colors.text,
              flex: 1,
              paddingLeft: leftIcon ? 0 : Spacing.md,
            },
            style,
          ]}
          placeholderTextColor={colors.textMuted}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...rest}
        />

        {rightIcon ? (
          <Pressable style={styles.icon} onPress={onRightIconPress}>
            {rightIcon}
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <Text style={[styles.hint, { color: colors.error }]}>{error}</Text>
      ) : hint ? (
        <Text style={[styles.hint, { color: colors.textMuted }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    overflow: 'hidden',
    elevation: 2,
  },
  input: {
    fontSize: FontSize.base,
    paddingVertical: Spacing.sm + 2,
    paddingRight: Spacing.md,
  },
  icon: {
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
});
