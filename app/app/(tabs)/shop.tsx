import { useQuery } from '@apollo/client';
import { Image } from 'expo-image';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/card';
import { ConditionGradePill, ConditionGrade } from '@/components/condition-grade-pill';
import { Currency } from '@/components/currency';
import { EmptyState } from '@/components/empty-state';
import { PageTitle } from '@/components/page-title';
import { Pill } from '@/components/pill';
import { ScreenContainer } from '@/components/screen-container';
import { Palette, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { BEST_SELLERS_QUERY, RENEWED_COLLECTION_QUERY } from '@/graphql/operations/products';

type Product = {
  id: string;
  title: string;
  description: string | null;
  price_inr: number;
  hero_image_url: string | null;
  category: string | null;
};

type RenewedProduct = {
  id: string;
  shopify_gid: string;
  title: string;
  tags: string[];
  variant_price_amount: string;
  variant_compare_at_amount: string | null;
  images: { src?: string; altText?: string }[];
};

function gradeFromTags(tags: string[]): ConditionGrade | null {
  const t = tags.find((x) => x.startsWith('condition:'));
  if (!t) return null;
  const grade = t.slice('condition:'.length);
  if (grade === 'good' || grade === 'fair' || grade === 'worn') return grade;
  return null;
}

export default function ShopScreen() {
  const { data: bestData, loading: bestLoading } = useQuery<{ products: Product[] }>(
    BEST_SELLERS_QUERY,
  );
  const { data: renewedData, loading: renewedLoading } = useQuery<{
    shopify_stub_products: RenewedProduct[];
  }>(RENEWED_COLLECTION_QUERY);

  const bestSellers = bestData?.products ?? [];
  const renewed = renewedData?.shopify_stub_products ?? [];

  return (
    <ScreenContainer>
      <PageTitle
        title="Curated for your Child's Journey"
        subtitle="Thoughtfully designed products to elevate everyday play, learning and independence."
      />

      <Text style={styles.sectionLabel}>Best Sellers</Text>
      {bestLoading && bestSellers.length === 0 ? (
        <Text style={styles.helper}>Loading best sellers...</Text>
      ) : null}
      <View style={styles.grid}>
        {bestSellers.map((p) => (
          <Pressable
            key={p.id}
            style={styles.gridItem}
            onPress={() =>
              Alert.alert(
                'Demo',
                'In production this would deep-link to the Shopify storefront for purchase.',
              )
            }>
            <Card padded={false} style={styles.gridCard}>
              {p.hero_image_url ? (
                <Image
                  source={{ uri: p.hero_image_url }}
                  style={styles.gridImg}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.gridImg, { backgroundColor: Palette.pastelPeach }]} />
              )}
              <View style={styles.gridBody}>
                <Text style={styles.gridTitle} numberOfLines={2}>
                  {p.title}
                </Text>
                <Currency amount={p.price_inr} style={styles.gridPrice} />
              </View>
            </Card>
          </Pressable>
        ))}
      </View>

      <View style={styles.renewedHead}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionLabel}>Miniture Renewed</Text>
          <Text style={styles.renewedSub}>
            Lovingly refurbished by other parents. Same quality, gentler price.
          </Text>
        </View>
        <Pill
          label="NEW"
          background={Palette.pastelGreen}
          dotColor={Palette.success}
          textColor={Palette.success}
        />
      </View>

      {renewedLoading && renewed.length === 0 ? (
        <Text style={styles.helper}>Loading Renewed collection...</Text>
      ) : null}

      {!renewedLoading && renewed.length === 0 ? (
        <EmptyState
          emoji="\u{1F33F}"
          headline="First refurbs are being processed"
          sub="Items returned by other parents land here once QC clears them. Check back soon!"
        />
      ) : null}

      {renewed.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.renewedScroll}
          contentContainerStyle={styles.renewedScrollInner}>
          {renewed.map((p) => {
            const grade = gradeFromTags(p.tags);
            const heroSrc = p.images?.[0]?.src;
            return (
              <Pressable
                key={p.id}
                onPress={() =>
                  Alert.alert(
                    'Demo',
                    'In production this would deep-link to the Shopify storefront for purchase.',
                  )
                }
                style={styles.renewedCardWrap}>
                <Card padded={false} style={styles.renewedCard}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>Renewed</Text>
                  </View>
                  {heroSrc ? (
                    <Image
                      source={{ uri: heroSrc }}
                      style={styles.renewedImg}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={[styles.renewedImg, { backgroundColor: Palette.pastelGreen }]} />
                  )}
                  <View style={styles.renewedBody}>
                    <Text style={styles.gridTitle} numberOfLines={2}>
                      {p.title}
                    </Text>
                    <View style={styles.priceRow}>
                      {p.variant_compare_at_amount ? (
                        <Currency
                          amount={p.variant_compare_at_amount}
                          style={styles.priceStrike}
                          strikethrough
                        />
                      ) : null}
                      <Currency amount={p.variant_price_amount} style={styles.priceLive} />
                    </View>
                    {grade ? <ConditionGradePill grade={grade} /> : null}
                  </View>
                </Card>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: Typography.subhead,
    fontWeight: Typography.bold as '700',
    color: Palette.textPrimary,
    marginBottom: Spacing.md,
    letterSpacing: -0.3,
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
    marginBottom: Spacing['2xl'],
  },
  gridItem: { flexBasis: '48%', flexGrow: 1 },
  gridCard: { overflow: 'hidden', ...Shadows.card },
  gridImg: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: Palette.bgSubtle,
  },
  gridBody: { padding: Spacing.md, gap: Spacing.xs },
  gridTitle: {
    fontSize: Typography.body,
    fontWeight: Typography.semibold as '600',
    color: Palette.textPrimary,
    minHeight: Typography.body * 2 * 1.3,
  },
  gridPrice: {
    fontSize: Typography.body,
    fontWeight: Typography.bold as '700',
    color: Palette.textPrimary,
  },
  renewedHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  renewedSub: {
    fontSize: Typography.body,
    color: Palette.textSecondary,
    marginTop: Spacing.xs,
    lineHeight: 20,
  },
  renewedScroll: { marginHorizontal: -Spacing.lg },
  renewedScrollInner: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  renewedCardWrap: { width: 220 },
  renewedCard: { overflow: 'hidden', ...Shadows.card },
  renewedImg: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: Palette.bgSubtle,
  },
  renewedBody: { padding: Spacing.md, gap: Spacing.sm },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.sm },
  priceStrike: {
    fontSize: Typography.body,
    color: Palette.textMuted,
  },
  priceLive: {
    fontSize: Typography.bodyLg,
    fontWeight: Typography.bold as '700',
    color: Palette.orange,
  },
  badge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: Palette.success,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    zIndex: 10,
  },
  badgeText: {
    fontSize: Typography.caption,
    fontWeight: Typography.bold as '700',
    color: Palette.textInverse,
    letterSpacing: 0.5,
  },
});
