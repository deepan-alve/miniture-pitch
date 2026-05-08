import { StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';

import { Palette, Radius, Spacing, Typography } from '@/constants/theme';

type Props = TextInputProps & {
  label?: string;
  helper?: string;
  error?: string;
  containerStyle?: ViewStyle;
};

export function Input({ label, helper, error, containerStyle, style, ...rest }: Props) {
  return (
    <View style={[styles.wrap, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={Palette.textMuted}
        {...rest}
        style={[styles.input, error ? styles.inputError : null, style]}
      />
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : helper ? (
        <Text style={styles.helper}>{helper}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.xs },
  label: {
    fontSize: Typography.caption,
    fontWeight: Typography.semibold as '600',
    color: Palette.textSecondary,
    marginLeft: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Palette.bgElevated,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    fontSize: Typography.bodyLg,
    color: Palette.textPrimary,
    minHeight: 48,
  },
  inputError: { borderColor: Palette.danger },
  helper: {
    fontSize: Typography.caption,
    color: Palette.textMuted,
    marginLeft: Spacing.xs,
  },
  error: {
    fontSize: Typography.caption,
    color: Palette.danger,
    marginLeft: Spacing.xs,
  },
});
