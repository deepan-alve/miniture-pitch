import { useQuery } from '@apollo/client';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useUserData } from '@nhost/react';

import { Card } from '@/components/card';
import { Currency } from '@/components/currency';
import { EmptyState } from '@/components/empty-state';
import { RelativeTime } from '@/components/relative-time';
import { ScreenContainer } from '@/components/screen-container';
import { Palette, Shadows, Spacing, Typography } from '@/constants/theme';
import { MY_OWNED_UNITS_QUERY } from '@/graphql/operations/owned-units';

type Unit = {
  id: string;
  acquired_at: string;
  product: {
    id: string;
    title: string;
    price_inr: number;
    hero_image_url: string | null;
    category: string | null;
  };
};

export default function MyProductsScreen() {
  const userData = useUserData();
  const { data, loading, error } = useQuery<{ owned_units: Unit[] }>(MY_OWNED_UNITS_QUERY, {
    variables: { authUserId: userData?.id },
    skip: !userData?.id,
  });

  const units = data?.owned_units ?? [];

  return (
    <ScreenContainer>
      <Text style={styles.intro}>
        Items you currently own. Tap one to send back, donate, or trade in.
      </Text>

      {loading && !data ? <Text style={styles.helper}>Loading your items...</Text> : null}
      {error ? (
        <Text style={styles.helper}>Could not load items right now: {error.message}</Text>
      ) : null}

      {!loading && !error && units.length === 0 ? (
        <EmptyState
          emoji="\u{1F4E6}"
          headline="No items yet"
          sub="Once you've ordered something from Miniture, it'll show up here for return or trade-in."
        />
      ) : null}

      <View style={styles.grid}>
        {units.map((unit) => (
          <Link key={unit.id} href={`/my-products/${unit.id}` as any} asChild>
            <Pressable style={styles.cardWrap}>
              <Card padded={false} style={styles.card}>
                {unit.product.hero_image_url ? (
                  <Image
                    source={{ uri: unit.product.hero_image_url }}
                    style={styles.thumb}
                    contentFit="cover"
                  />
                ) : (
                  <View style={[styles.thumb, styles.thumbFallback]}>
                    <Text style={styles.thumbFallbackText}>No image</Text>
                  </View>
                )}
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {unit.product.title}
                  </Text>
                  <Currency amount={unit.product.price_inr} style={styles.cardPrice} />
                  <RelativeTime date={unit.acquired_at} style={styles.cardMeta} />
                </View>
              </Card>
            </Pressable>
          </Link>
        ))}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  intro: {
    fontSize: Typography.body,
    color: Palette.textSecondary,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  helper: {
    fontSize: Typography.body,
    color: Palette.textSecondary,
    marginBottom: Spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  cardWrap: { flexBasis: '48%', flexGrow: 1 },
  card: { overflow: 'hidden', ...Shadows.card },
  thumb: { width: '100%', aspectRatio: 1, backgroundColor: Palette.bgSubtle },
  thumbFallback: { alignItems: 'center', justifyContent: 'center' },
  thumbFallbackText: {
    fontSize: Typography.caption,
    color: Palette.textMuted,
  },
  cardBody: {
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  cardTitle: {
    fontSize: Typography.body,
    fontWeight: Typography.semibold as '600',
    color: Palette.textPrimary,
    minHeight: Typography.body * 2 * 1.3,
  },
  cardPrice: {
    fontSize: Typography.body,
    fontWeight: Typography.bold as '700',
    color: Palette.textPrimary,
  },
  cardMeta: {
    fontSize: Typography.caption,
    color: Palette.textMuted,
  },
});
