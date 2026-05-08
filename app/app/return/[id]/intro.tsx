import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ScreenContainer } from '@/components/screen-container';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';
import { useReturnFlow } from '@/hooks/use-return-flow';

const STEPS = [
  {
    emoji: '\u{1F4F8}',
    title: 'A few quick photos',
    body: 'Front view, any wear, and the parts so we know what we’re receiving.',
  },
  {
    emoji: '\u{1F69A}',
    title: 'We come pick it up',
    body: 'Pick a slot. Our courier scans a QR code and packs it for you.',
  },
  {
    emoji: '\u{1F381}',
    title: 'Choose your reward',
    body: 'Cash credit, trade-in bonus, or donate for a thank-you discount + impact.',
  },
];

export default function ReturnIntroScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const flow = useReturnFlow();

  // Seed the owned-unit id into the flow state on first mount.
  useEffect(() => {
    if (id && flow.ownedUnitId !== id) {
      flow.reset();
      flow.setOwnedUnitId(id);
    }
  }, [id, flow]);

  return (
    <ScreenContainer>
      <Text style={styles.headline}>Give it a second life</Text>
      <Text style={styles.lead}>
        Three quick steps. We refurbish, relist, or donate — and you get credit, a bonus, or
        impact.
      </Text>

      <View style={styles.stepList}>
        {STEPS.map((s, i) => (
          <Card key={s.title} style={styles.stepCard}>
            <View style={styles.stepRow}>
              <View style={styles.stepIcon}>
                <Text style={styles.stepEmoji}>{s.emoji}</Text>
              </View>
              <View style={styles.stepBody}>
                <Text style={styles.stepIndex}>STEP {i + 1}</Text>
                <Text style={styles.stepTitle}>{s.title}</Text>
                <Text style={styles.stepDesc}>{s.body}</Text>
              </View>
            </View>
          </Card>
        ))}
      </View>

      <View style={styles.cta}>
        <Button label="Continue" onPress={() => router.push(`/return/${id}/photos` as any)} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headline: {
    fontSize: Typography.heading,
    fontWeight: Typography.bold as '700',
    color: Palette.textPrimary,
    marginBottom: Spacing.xs,
  },
  lead: {
    fontSize: Typography.body,
    color: Palette.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  stepList: { gap: Spacing.md, marginBottom: Spacing.xl },
  stepCard: { padding: Spacing.lg },
  stepRow: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
  stepIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.pill,
    backgroundColor: Palette.pastelPeach,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepEmoji: { fontSize: 22 },
  stepBody: { flex: 1, gap: 2 },
  stepIndex: {
    fontSize: Typography.caption,
    color: Palette.textMuted,
    fontWeight: Typography.bold as '700',
    letterSpacing: 1,
  },
  stepTitle: {
    fontSize: Typography.subhead,
    fontWeight: Typography.bold as '700',
    color: Palette.textPrimary,
  },
  stepDesc: {
    fontSize: Typography.body,
    color: Palette.textSecondary,
    lineHeight: 20,
  },
  cta: { marginTop: Spacing.lg },
});
