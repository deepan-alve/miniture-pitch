// Local fallback primitives for admin lane.
//
// These exist because the consumer agent owns `app/components/` and may not
// have shipped `Input` / `EmptyState` yet by the time the admin screens
// import them. If/when those primitives land in `app/components/`, these
// fallbacks can be deleted and imports re-pointed.
//
// Already-available shared primitives (DO NOT redefine here):
//   - Button, Card, Pill, SegmentedControl, ScreenContainer, PageTitle

import { ReactNode } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';

import { Palette, Radius, Spacing, Typography } from '@/constants/theme';

// ----- Input ---------------------------------------------------------------

type InputProps = TextInputProps & {
  label?: string;
  error?: string;
  multiline?: boolean;
};

export function Input({ label, error, multiline, style, ...rest }: InputProps) {
  return (
    <View style={styles.inputWrap}>
      {label ? <Text style={styles.inputLabel}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={Palette.textMuted}
        multiline={multiline}
        style={[
          styles.input,
          multiline ? styles.inputMultiline : null,
          error ? styles.inputError : null,
          style,
        ]}
        {...rest}
      />
      {error ? <Text style={styles.inputErrorText}>{error}</Text> : null}
    </View>
  );
}

// ----- EmptyState ----------------------------------------------------------

type EmptyStateProps = {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
  style?: ViewStyle;
};

export function EmptyState({ title, subtitle, icon, action, style }: EmptyStateProps) {
  return (
    <View style={[styles.emptyWrap, style]}>
      {icon ? <View style={styles.emptyIcon}>{icon}</View> : null}
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySubtitle}>{subtitle}</Text> : null}
      {action ? <View style={styles.emptyAction}>{action}</View> : null}
    </View>
  );
}

// ----- styles --------------------------------------------------------------

const styles = StyleSheet.create({
  inputWrap: { gap: Spacing.xs },
  inputLabel: {
    fontSize: Typography.caption,
    fontWeight: Typography.semibold as '600',
    color: Palette.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  input: {
    backgroundColor: Palette.bgElevated,
    borderColor: Palette.border,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    fontSize: Typography.body,
    color: Palette.textPrimary,
  },
  inputMultiline: { minHeight: 88, textAlignVertical: 'top' },
  inputError: { borderColor: Palette.danger },
  inputErrorText: { color: Palette.danger, fontSize: Typography.caption },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['3xl'],
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  emptyIcon: { marginBottom: Spacing.xs },
  emptyTitle: {
    fontSize: Typography.subhead,
    fontWeight: Typography.semibold as '600',
    color: Palette.textPrimary,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: Typography.body,
    color: Palette.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  emptyAction: { marginTop: Spacing.base },
});
