import { useQuery } from '@apollo/client';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Currency } from '@/components/currency';
import { Pill } from '@/components/pill';
import { RelativeTime } from '@/components/relative-time';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';
import { OWNED_UNIT_DETAIL_QUERY } from '@/graphql/operations/owned-units';

type Detail = {
  id: string;
  acquired_at: string;
  product: {
    id: string;
    title: string;
    description: string | null;
    price_inr: number;
    hero_image_url: string | null;
    category: string | null;
  };
};

export default function MyProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data, loading, error } = useQuery<{ owned_units_by_pk: Detail | null }>(
    OWNED_UNIT_DETAIL_QUERY,
    { variables: { id }, skip: !id },
  );

  const unit = data?.owned_units_by_pk;

  if (loading && !unit) {
    return (
      <SafeAreaView style={styles.root}>
        <Text style={styles.loading}>Loading product...</Text>
      </SafeAreaView>
    );
  }

  if (error || !unit) {
    return (
      <SafeAreaView style={styles.root}>
        <Text style={styles.loading}>
          Could not load this item{error ? `: ${error.message}` : ''}.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        {unit.product.hero_image_url ? (
          <Image
            source={{ uri: unit.product.hero_image_url }}
            style={styles.hero}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.hero, styles.heroFallback]} />
        )}

        <View style={styles.content}>
          {unit.product.category ? (
            <Pill
              label={unit.product.category.replace(/_/g, ' ')}
              background={Palette.pastelBlue}
              dotColor={Palette.bluePrimary}
            />
          ) : null}

          <Text style={styles.title}>{unit.product.title}</Text>
          <Currency amount={unit.product.price_inr} style={styles.price} />

          <Text style={styles.meta}>
            Acquired <RelativeTime date={unit.acquired_at} style={styles.metaInline} />
          </Text>

          {unit.product.description ? (
            <Card style={styles.descCard}>
              <Text style={styles.descTitle}>About</Text>
              <Text style={styles.desc}>{unit.product.description}</Text>
            </Card>
          ) : null}
        </View>
      </ScrollView>

      <View style={styles.ctaBar}>
        <Button
          label="Send back / Donate / Trade-in"
          trailing={<Text style={styles.ctaArrow}>{'→'}</Text>}
          onPress={() => router.push(`/return/${unit.id}/intro` as any)}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Palette.bg },
  loading: {
    fontSize: Typography.body,
    color: Palette.textSecondary,
    padding: Spacing.lg,
  },
  scrollBody: { paddingBottom: Spacing['4xl'] + Spacing['2xl'] },
  hero: {
    width: '100%',
    aspectRatio: 1.1,
    backgroundColor: Palette.bgSubtle,
  },
  heroFallback: { backgroundColor: Palette.pastelPeach },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    gap: Spacing.sm,
  },
  title: {
    fontSize: Typography.heading,
    fontWeight: Typography.bold as '700',
    color: Palette.textPrimary,
  },
  price: {
    fontSize: Typography.title,
    fontWeight: Typography.bold as '700',
    color: Palette.orange,
  },
  meta: {
    fontSize: Typography.body,
    color: Palette.textSecondary,
  },
  metaInline: {
    fontSize: Typography.body,
    color: Palette.textPrimary,
    fontWeight: Typography.semibold as '600',
  },
  descCard: { marginTop: Spacing.md },
  descTitle: {
    fontSize: Typography.body,
    fontWeight: Typography.bold as '700',
    color: Palette.textPrimary,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  desc: {
    fontSize: Typography.body,
    color: Palette.textSecondary,
    lineHeight: 20,
  },
  ctaBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    backgroundColor: Palette.bg,
    borderTopWidth: 1,
    borderTopColor: Palette.border,
    borderTopLeftRadius: Radius.cardLg,
    borderTopRightRadius: Radius.cardLg,
  },
  ctaArrow: {
    fontSize: Typography.bodyLg,
    color: Palette.textInverse,
    fontWeight: Typography.bold as '700',
  },
});
