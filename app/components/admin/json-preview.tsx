import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Palette, Radius, Spacing, Typography } from '@/constants/theme';

// Collapsible pretty-JSON viewer for stub-log payloads.
// Default collapsed because each row in the stub log gets one — the demo
// looks cleaner when only the row the admin taps is expanded.

type Props = {
  label: string;
  value: unknown;
  defaultOpen?: boolean;
};

export function JsonPreview({ label, value, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  if (value === null || value === undefined) {
    return (
      <View style={styles.emptyRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.emptyValue}>null</Text>
      </View>
    );
  }

  let pretty: string;
  try {
    pretty = JSON.stringify(value, null, 2);
  } catch {
    pretty = String(value);
  }

  return (
    <View style={styles.wrap}>
      <Pressable style={styles.header} onPress={() => setOpen((v) => !v)}>
        <Text style={styles.toggle}>{open ? '▾' : '▸'}</Text>
        <Text style={styles.label}>{label}</Text>
        {!open ? (
          <Text style={styles.preview} numberOfLines={1}>
            {pretty.replace(/\s+/g, ' ').slice(0, 80)}
          </Text>
        ) : null}
      </Pressable>
      {open ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.codeBox}
          contentContainerStyle={styles.codeContent}>
          <Text style={styles.code}>{pretty}</Text>
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.xs },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  toggle: {
    color: Palette.textSecondary,
    fontSize: Typography.body,
    fontWeight: Typography.bold as '700',
    width: 12,
  },
  label: {
    fontSize: Typography.caption,
    color: Palette.textSecondary,
    fontWeight: Typography.semibold as '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  preview: {
    flex: 1,
    fontFamily: 'monospace',
    fontSize: 11,
    color: Palette.textMuted,
  },
  emptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyValue: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: Palette.textMuted,
  },
  codeBox: {
    backgroundColor: Palette.black,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  codeContent: { paddingRight: Spacing.lg },
  code: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#D8F0DC',
    lineHeight: 16,
  },
});
