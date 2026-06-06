// ─── Reusable UI Button Component ────────────────────────────────────────────
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  type TouchableOpacityProps,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useColors } from '@/hooks/useThemeColor';
import { BorderRadius, FontSize, FontWeight, Spacing } from '@/constants/Layout';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled,
  onPress,
  style,
  ...rest
}: ButtonProps) {
  const colors = useColors();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  const variantStyles = {
    primary: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    secondary: {
      backgroundColor: colors.surfaceElevated,
      borderColor: colors.border,
    },
    outline: {
      backgroundColor: 'transparent',
      borderColor: colors.primary,
    },
    ghost: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
    },
    danger: {
      backgroundColor: colors.error,
      borderColor: colors.error,
    },
  };

  const textColors = {
    primary: '#FFFFFF',
    secondary: colors.text,
    outline: colors.primary,
    ghost: colors.primary,
    danger: '#FFFFFF',
  };

  const sizeStyles = {
    sm: {
      paddingVertical: Spacing.xs,
      paddingHorizontal: Spacing.md,
      fontSize: FontSize.sm,
      borderRadius: BorderRadius.md,
    },
    md: {
      paddingVertical: Spacing.sm + 2,
      paddingHorizontal: Spacing.lg,
      fontSize: FontSize.base,
      borderRadius: BorderRadius.md,
    },
    lg: {
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.xl,
      fontSize: FontSize.md,
      borderRadius: BorderRadius.lg,
    },
  };

  const isDisabled = disabled || isLoading;

  return (
    <AnimatedTouchable
      style={[
        styles.base,
        variantStyles[variant],
        {
          paddingVertical: sizeStyles[size].paddingVertical,
          paddingHorizontal: sizeStyles[size].paddingHorizontal,
          borderRadius: sizeStyles[size].borderRadius,
          width: fullWidth ? '100%' : undefined,
          opacity: isDisabled ? 0.5 : 1,
        },
        animatedStyle,
        style,
      ]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={1}
      {...rest}
    >
      {leftIcon && !isLoading ? leftIcon : null}
      {isLoading ? (
        <ActivityIndicator size="small" color={textColors[variant]} />
      ) : (
        <Text
          style={[
            styles.text,
            {
              color: textColors[variant],
              fontSize: sizeStyles[size].fontSize,
            },
          ]}
        >
          {title}
        </Text>
      )}
      {rightIcon && !isLoading ? rightIcon : null}
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    borderWidth: 1.5,
  },
  text: {
    fontWeight: FontWeight.semibold,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});
