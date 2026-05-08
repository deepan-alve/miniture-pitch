import { StyleSheet, Text, View } from 'react-native';

import { PageTitle } from '@/components/page-title';
import { ScreenContainer } from '@/components/screen-container';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';

export default function PlaylistScreen() {
  return (
    <ScreenContainer>
      <PageTitle title="Playlist" />
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Your saved activities will live here.</Text>
        <Text style={styles.emptyHint}>Wired to Hasura `playlists` table next.</Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  empty: {
    padding: Spacing.xl,
    borderRadius: Radius.card,
    backgroundColor: Palette.bgSubtle,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: Typography.bodyLg,
    fontWeight: Typography.semibold as '600',
    color: Palette.textPrimary,
    marginBottom: Spacing.xs,
  },
  emptyHint: { fontSize: Typography.body, color: Palette.textSecondary },
});
