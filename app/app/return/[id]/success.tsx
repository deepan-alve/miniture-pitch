import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ScreenContainer } from '@/components/screen-container';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';

// Confirmation step. We don't actually generate a real QR-code SVG —
// react-native-qrcode-svg would add a dependency. Instead we show the
// truncated request id in a stylized rectangle, which is what the courier
// would scan in production.

export default function ReturnSuccessScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const requestId = typeof id === 'string' ? id : '';
  const shortId = requestId ? requestId.slice(0, 8).toUpperCase() : '--------';

  return (
    <ScreenContainer contentStyle={styles.body}>
      <View style={styles.checkWrap}>
        <View style={styles.check}>
          <Text style={styles.checkMark}>{'✓'}</Text>
        </View>
      </View>

      <Text style={styles.headline}>We’ve got it {'\u{1F4E6}'}</Text>
      <Text style={styles.sub}>
        Pickup is booked. The courier will scan this code at your door.
      </Text>

      <Card style={styles.qrCard}>
        <View style={styles.qrFrame}>
          <View style={styles.qrInner}>
            <Text style={styles.qrText}>{shortId}</Text>
          </View>
        </View>
        <Text style={styles.qrLabel}>Pickup code</Text>
      </Card>

      <View style={styles.cta}>
        <Button
          label="Track this return"
          onPress={() => router.replace(`/return/${requestId}/track` as any)}
        />
        <Button
          variant="secondary"
          label="Done"
          onPress={() => router.replace('/' as any)}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingTop: Spacing['3xl'],
    alignItems: 'center',
  },
  checkWrap: { marginBottom: Spacing.xl },
  check: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Palette.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    color: Palette.textInverse,
    fontSize: 56,
    fontWeight: Typography.extrabold as '800',
    lineHeight: 64,
  },
  headline: {
    fontSize: Typography.display,
    fontWeight: Typography.extrabold as '800',
    color: Palette.textPrimary,
    textAlign: 'center',
    letterSpacing: -1,
  },
  sub: {
    fontSize: Typography.bodyLg,
    color: Palette.textSecondary,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: Spacing.lg,
  },
  qrCard: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.md,
  },
  qrFrame: {
    width: 200,
    height: 200,
    borderRadius: Radius.md,
    backgroundColor: Palette.black,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
  },
  qrInner: {
    flex: 1,
    width: '100%',
    backgroundColor: Palette.bgElevated,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrText: {
    fontSize: Typography.title,
    fontFamily: 'monospace',
    fontWeight: Typography.bold as '700',
    color: Palette.textPrimary,
    letterSpacing: 2,
  },
  qrLabel: {
    fontSize: Typography.caption,
    color: Palette.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontWeight: Typography.semibold as '600',
  },
  cta: {
    alignSelf: 'stretch',
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
});
