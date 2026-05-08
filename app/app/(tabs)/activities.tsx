import { StyleSheet, Text, View } from 'react-native';

import { PageTitle } from '@/components/page-title';
import { ScreenContainer } from '@/components/screen-container';
import { Palette, PastelDeck, Radius, Spacing, Typography } from '@/constants/theme';

// Activities tab — placeholder for the activity catalog (categories: Numeracy,
// Literacy, Logical Reasoning, Fine Motor, Sensory). Wires to Hasura
// `products` later.

const CATEGORIES = ['Numeracy', 'Literacy', 'Logical Reasoning', 'Fine Motor', 'Sensory'];

export default function ActivitiesScreen() {
  return (
    <ScreenContainer>
      <PageTitle title="Activities" />
      <View style={styles.grid}>
        {CATEGORIES.map((label, i) => (
          <View
            key={label}
            style={[styles.card, { backgroundColor: PastelDeck[i % PastelDeck.length] }]}>
            <Text style={styles.cardLabel}>{label}</Text>
          </View>
        ))}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  card: {
    flexBasis: '48%',
    aspectRatio: 1.4,
    borderRadius: Radius.card,
    padding: Spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: Typography.subhead,
    fontWeight: Typography.semibold as '600',
    color: Palette.textPrimary,
  },
});
