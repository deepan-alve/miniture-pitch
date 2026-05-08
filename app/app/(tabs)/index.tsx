import { StyleSheet, Text, View } from 'react-native';

import { ScreenContainer } from '@/components/screen-container';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';

// Home tab — placeholder. Real content (AI greeting + suggestion bubbles +
// action chips) lands once auth + Hasura wiring is in place.

export default function HomeScreen() {
  return (
    <ScreenContainer>
      <Text style={styles.greeting}>Hello, Josh's Parent!</Text>
      <View style={styles.suggestionCard}>
        <Text style={styles.suggestionText}>Any creative play ideas using flexdesk?</Text>
      </View>
      <View style={[styles.suggestionCard, { backgroundColor: Palette.pastelGreen }]}>
        <Text style={styles.suggestionText}>
          Tips for tantrum moments — how can I stay gentle and firm?
        </Text>
      </View>
      <View style={styles.placeholder}>
        <Text style={styles.placeholderHint}>
          Action chips, lightning activity, AI chat input — coming after auth wiring.
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  greeting: {
    fontSize: Typography.subhead,
    fontWeight: Typography.semibold as '600',
    color: Palette.textPrimary,
    marginBottom: Spacing.lg,
  },
  suggestionCard: {
    backgroundColor: Palette.pastelPink,
    borderRadius: Radius.card,
    padding: Spacing.xl,
    marginBottom: Spacing.md,
  },
  suggestionText: {
    fontSize: Typography.bodyLg,
    fontWeight: Typography.semibold as '600',
    color: Palette.textPrimary,
    textAlign: 'center',
    lineHeight: 24,
  },
  placeholder: {
    marginTop: Spacing['2xl'],
    padding: Spacing.lg,
    borderRadius: Radius.md,
    backgroundColor: Palette.bgSubtle,
    borderWidth: 1,
    borderColor: Palette.border,
    borderStyle: 'dashed',
  },
  placeholderHint: {
    fontSize: Typography.body,
    color: Palette.textSecondary,
    textAlign: 'center',
  },
});
