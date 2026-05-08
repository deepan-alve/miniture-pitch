import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Palette, Radius, Spacing, Typography } from '@/constants/theme';

// Black-active segmented control.
// Generic over the option value so callers can switch on enum-ish strings safely.

type Props<T extends string> = {
  options: { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
};

export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <View style={styles.wrap}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            style={[styles.segment, active ? styles.segmentActive : null]}
            onPress={() => onChange(opt.value)}>
            <Text style={[styles.label, active ? styles.labelActive : null]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: Palette.bgSubtle,
    borderRadius: Radius.pill,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    alignItems: 'center',
  },
  segmentActive: { backgroundColor: Palette.black },
  label: {
    fontSize: Typography.body,
    fontWeight: Typography.semibold as '600',
    color: Palette.textSecondary,
  },
  labelActive: { color: Palette.textInverse },
});
