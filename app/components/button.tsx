import { ActivityIndicator, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { ReactNode } from 'react';

import { Palette, Radius, Shadows, Spacing, Typography } from '@/constants/theme';

// Single Button primitive — three variants. Loading state swaps in a spinner;
// disabled state dims the surface but keeps it visible.

type Variant = 'primary' | 'secondary' | 'ghost';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
  style?: ViewStyle;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  fullWidth = true,
  leading,
  trailing,
  style,
}: Props) {
  const isDisabled = disabled || loading;
  const variantStyle = VARIANTS[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variantStyle.surface,
        fullWidth ? styles.fullWidth : null,
        pressed ? { opacity: 0.85 } : null,
        isDisabled ? { opacity: 0.5 } : null,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={variantStyle.spinner} />
      ) : (
        <View style={styles.row}>
          {leading}
          <Text style={[styles.label, variantStyle.label]}>{label}</Text>
          {trailing}
        </View>
      )}
    </Pressable>
  );
}

const VARIANTS: Record<
  Variant,
  { surface: ViewStyle; label: { color: string }; spinner: string }
> = {
  primary: {
    surface: {
      backgroundColor: Palette.orange,
      ...Shadows.cta,
    },
    label: { color: Palette.textInverse },
    spinner: Palette.textInverse,
  },
  secondary: {
    surface: {
      backgroundColor: Palette.bgElevated,
      borderWidth: 1,
      borderColor: Palette.border,
    },
    label: { color: Palette.textPrimary },
    spinner: Palette.textPrimary,
  },
  ghost: {
    surface: { backgroundColor: 'transparent' },
    label: { color: Palette.textSecondary },
    spinner: Palette.textSecondary,
  },
};

const styles = StyleSheet.create({
  base: {
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  fullWidth: { alignSelf: 'stretch' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  label: {
    fontSize: Typography.bodyLg,
    fontWeight: Typography.semibold as '600',
  },
});
