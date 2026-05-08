import { StyleSheet, Text, View, ViewStyle } from 'react-native';

import { Palette, Radius, Spacing, Typography } from '@/constants/theme';

// Small tag pill with an optional colored dot prefix.
// Background and text colors are tunable; defaults to a soft cream pill.

type Props = {
  label: string;
  dotColor?: string;
  background?: string;
  textColor?: string;
  style?: ViewStyle;
};

export function Pill({
  label,
  dotColor,
  background = Palette.bgSubtle,
  textColor = Palette.textPrimary,
  style,
}: Props) {
  return (
    <View style={[styles.wrap, { backgroundColor: background }, style]}>
      {dotColor ? <View style={[styles.dot, { backgroundColor: dotColor }]} /> : null}
      <Text style={[styles.label, { color: textColor }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    gap: Spacing.xs,
    alignSelf: 'flex-start',
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: {
    fontSize: Typography.caption,
    fontWeight: Typography.semibold as '600',
  },
});
