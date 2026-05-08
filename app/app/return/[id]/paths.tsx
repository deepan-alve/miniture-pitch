import { useQuery } from '@apollo/client';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '@/components/button';
import { Currency } from '@/components/currency';
import { Pill } from '@/components/pill';
import { ScreenContainer } from '@/components/screen-container';
import { Palette, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { useCurrentAccount } from '@/hooks/use-current-account';
import { OWNED_UNIT_DETAIL_QUERY } from '@/graphql/operations/owned-units';
import {
  refurbPayout,
  tradeInPayout,
  usePathRecommendation,
} from '@/hooks/use-path-recommendation';
import type { ReturnPath } from '@/hooks/use-path-recommendation';
import { useReturnFlow } from '@/hooks/use-return-flow';

type PathCard = {
  value: ReturnPath;
  emoji: string;
  title: string;
  oneLiner: string;
  pillLabel: string;
  pillBg: string;
  pillDot: string;
  amountInr?: number;
  amountLabel?: string;
};

export default function ReturnPathsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const flow = useReturnFlow();
  const { account } = useCurrentAccount();

  const { data } = useQuery<{ owned_units_by_pk: { product: { price_inr: number } } | null }>(
    OWNED_UNIT_DETAIL_QUERY,
    { variables: { id }, skip: !id },
  );

  const originalPrice = data?.owned_units_by_pk?.product.price_inr ?? 0;
  const grade = flow.grade ?? 'good';

  const recommended = usePathRecommendation(account?.child_profiles);

  const refurbAmount = refurbPayout(originalPrice, grade);
  const tradeInAmount = tradeInPayout(originalPrice, grade);

  const cards: PathCard[] = [
    {
      value: 'refurb',
      emoji: '\u{267B}\u{FE0F}',
      title: 'Cash credit',
      oneLiner: 'Sent to your store credit (no expiry).',
      pillLabel: 'No expiry',
      pillBg: Palette.pastelBlue,
      pillDot: Palette.bluePrimary,
      amountInr: refurbAmount,
      amountLabel: "You'll get",
    },
    {
      value: 'trade_in',
      emoji: '\u{1F381}',
      title: 'Trade-in bonus',
      oneLiner: '25% extra on your credit, locks to next 12 months.',
      pillLabel: 'Bonus 25% — 12 mo',
      pillBg: Palette.pastelPeach,
      pillDot: Palette.orange,
      amountInr: tradeInAmount,
      amountLabel: "You'll get",
    },
    {
      value: 'donate',
      emoji: '\u{1F49B}',
      title: 'Donate',
      oneLiner: '15% off your next order. We send it to an NGO partner.',
      pillLabel: 'NGO + tax certificate',
      pillBg: Palette.pastelGreen,
      pillDot: Palette.success,
      amountLabel: 'Impact + 15% off',
    },
  ];

  const onSelect = (path: ReturnPath) => {
    flow.setPath(path);
    router.push(`/return/${id}/confirm` as any);
  };

  return (
    <ScreenContainer>
      <Text style={styles.headline}>Three ways to send it back</Text>
      <Text style={styles.lead}>
        Same physical pickup, different rewards. Estimates based on your{' '}
        <Text style={styles.leadEmph}>{grade}</Text> condition.
      </Text>

      <View style={styles.list}>
        {cards.map((c) => {
          const isRecommended = c.value === recommended;
          const active = flow.path === c.value;
          return (
            <Pressable
              key={c.value}
              onPress={() => onSelect(c.value)}
              style={[
                styles.card,
                isRecommended ? styles.cardRecommended : null,
                active ? styles.cardActive : null,
              ]}>
              {isRecommended ? (
                <View style={styles.ribbon}>
                  <Text style={styles.ribbonText}>Recommended for you</Text>
                </View>
              ) : null}

              <View style={styles.cardHead}>
                <Text style={styles.cardEmoji}>{c.emoji}</Text>
                <Pill label={c.pillLabel} background={c.pillBg} dotColor={c.pillDot} />
              </View>

              <Text style={styles.cardTitle}>{c.title}</Text>

              {typeof c.amountInr === 'number' ? (
                <View style={styles.amountRow}>
                  <Text style={styles.amountLabel}>{c.amountLabel}</Text>
                  <Currency amount={c.amountInr} style={styles.amount} />
                </View>
              ) : (
                <Text style={styles.amountAlt}>{c.amountLabel}</Text>
              )}

              <Text style={styles.cardOneLiner}>{c.oneLiner}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.cta}>
        <Button
          label="Continue with selected path"
          disabled={!flow.path}
          onPress={() => flow.path && router.push(`/return/${id}/confirm` as any)}
        />
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
  leadEmph: { color: Palette.textPrimary, fontWeight: Typography.bold as '700' },
  list: { gap: Spacing.md },
  card: {
    backgroundColor: Palette.bgElevated,
    borderRadius: Radius.cardLg,
    padding: Spacing.xl,
    borderWidth: 2,
    borderColor: Palette.border,
  },
  cardRecommended: {
    borderColor: Palette.orange,
    ...Shadows.card,
  },
  cardActive: {
    borderColor: Palette.black,
    ...Shadows.cta,
  },
  ribbon: {
    position: 'absolute',
    top: -Spacing.sm,
    right: Spacing.lg,
    backgroundColor: Palette.orange,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
  },
  ribbonText: {
    fontSize: Typography.caption,
    fontWeight: Typography.bold as '700',
    color: Palette.textInverse,
    letterSpacing: 0.5,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  cardEmoji: { fontSize: 28 },
  cardTitle: {
    fontSize: Typography.title,
    fontWeight: Typography.bold as '700',
    color: Palette.textPrimary,
    marginBottom: Spacing.xs,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  amountLabel: {
    fontSize: Typography.caption,
    color: Palette.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: Typography.semibold as '600',
  },
  amount: {
    fontSize: Typography.heading,
    fontWeight: Typography.extrabold as '800',
    color: Palette.orange,
  },
  amountAlt: {
    fontSize: Typography.subhead,
    fontWeight: Typography.bold as '700',
    color: Palette.success,
    marginBottom: Spacing.sm,
  },
  cardOneLiner: {
    fontSize: Typography.body,
    color: Palette.textSecondary,
    lineHeight: 20,
  },
  cta: { marginTop: Spacing.xl },
});
