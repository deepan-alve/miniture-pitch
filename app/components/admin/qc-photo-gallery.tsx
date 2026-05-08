import { useMemo } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Palette, Radius, Spacing, Typography } from '@/constants/theme';
import { NHOST_REGION, NHOST_SUBDOMAIN } from '@/lib/env';

// Horizontal photo strip for assessment_photos. Each tile labels which
// prompt the photo answers (front / damage / all_parts) — the QC reviewer
// can scan whether the parent submitted a complete set.

type Photo = {
  id: string;
  prompt: string;
  storage_path: string;
};

type Props = {
  photos: Photo[];
  size?: 'sm' | 'md' | 'lg';
};

const TILE_SIZES = { sm: 80, md: 120, lg: 160 } as const;

const STORAGE_BASE = `https://${NHOST_SUBDOMAIN}.storage.${NHOST_REGION}.nhost.run/v1/files`;

function urlFor(storagePath: string): string {
  // storage_path may already be a public URL (seed/test data) or a Nhost
  // storage file id — try both shapes. We accept absolute URLs verbatim.
  if (/^https?:\/\//i.test(storagePath)) return storagePath;
  // Treat as a Nhost storage file id.
  return `${STORAGE_BASE}/${storagePath}`;
}

function prettifyPrompt(prompt: string): string {
  switch (prompt) {
    case 'front':
      return 'Front';
    case 'damage':
      return 'Damage';
    case 'all_parts':
      return 'All parts';
    default:
      return prompt.replace(/_/g, ' ');
  }
}

export function QcPhotoGallery({ photos, size = 'md' }: Props) {
  const tile = TILE_SIZES[size];

  const sorted = useMemo(() => {
    // Stable order so prompts always line up the same way across renders.
    const order: Record<string, number> = { front: 0, damage: 1, all_parts: 2 };
    return [...photos].sort(
      (a, b) => (order[a.prompt] ?? 99) - (order[b.prompt] ?? 99),
    );
  }, [photos]);

  if (!sorted.length) {
    return (
      <View style={[styles.empty, { height: tile }]}>
        <Text style={styles.emptyText}>No photos submitted</Text>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}>
      {sorted.map((photo) => (
        <View key={photo.id} style={[styles.tileWrap, { width: tile }]}>
          <Image
            source={{ uri: urlFor(photo.storage_path) }}
            style={[styles.image, { width: tile, height: tile }]}
            resizeMode="cover"
          />
          <Text style={styles.caption} numberOfLines={1}>
            {prettifyPrompt(photo.prompt)}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: Spacing.sm, paddingRight: Spacing.lg },
  tileWrap: { gap: Spacing.xs },
  image: {
    borderRadius: Radius.md,
    backgroundColor: Palette.bgSubtle,
  },
  caption: {
    fontSize: Typography.caption,
    color: Palette.textSecondary,
    fontWeight: Typography.medium as '500',
  },
  empty: {
    backgroundColor: Palette.bgSubtle,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  emptyText: {
    color: Palette.textMuted,
    fontSize: Typography.body,
  },
});
