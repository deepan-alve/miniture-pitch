import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Palette, Radius, Spacing, Typography } from '@/constants/theme';

type Props = {
  headline: string;
  sub?: string;
  illustration?: ReactNode;
  emoji?: string;
};

export function EmptyState({ headline, sub, illustration, emoji }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.illoSlot}>
        {illustration ?? (
          <Text style={styles.emoji}>{emoji ?? '\u{1F331}'}</Text>
        )}
      </View>
      <Text style={styles.headline}>{headline}</Text>
      {sub ? <Text style={styles.sub}>{sub}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
    paddingHorizontal: Spacing.xl,
  },
  illoSlot: {
    width: 96,
    height: 96,
    borderRadius: Radius.cardLg,
    backgroundColor: Palette.pastelCream,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emoji: { fontSize: 48 },
  headline: {
    fontSize: Typography.subhead,
    fontWeight: Typography.bold as '700',
    color: Palette.textPrimary,
    textAlign: 'center',
  },
  sub: {
    fontSize: Typography.body,
    color: Palette.textSecondary,
    marginTop: Spacing.xs,
    textAlign: 'center',
    lineHeight: 20,
  },
});
