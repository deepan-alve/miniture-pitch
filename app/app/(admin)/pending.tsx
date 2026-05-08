import { useSubscription } from '@apollo/client';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { formatDistanceToNow } from 'date-fns';

import { ScreenContainer } from '@/components/screen-container';
import { PageTitle } from '@/components/page-title';
import { Card } from '@/components/card';
import { Pill } from '@/components/pill';
import { EmptyState } from '@/components/admin/_primitives';
import { QcPhotoGallery } from '@/components/admin/qc-photo-gallery';
import {
  ADMIN_PENDING_REQUESTS_SUBSCRIPTION,
  AdminPendingRequest,
  AdminPendingRequestsData,
} from '@/graphql/operations/admin';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';

// Live list of return requests waiting for QC review. New requests pop in
// without a refresh — that's part of the demo's "feels alive" story.

const PATH_LABELS: Record<string, { label: string; color: string }> = {
  refurb: { label: 'Refurb', color: Palette.pastelGreen },
  trade_in: { label: 'Trade-in', color: Palette.pastelLavender },
  donate: { label: 'Donate', color: Palette.pastelPeach },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  submitted: { label: 'Submitted', color: Palette.pastelYellow },
  pickup_scheduled: { label: 'Pickup scheduled', color: Palette.pastelBlue },
  in_transit: { label: 'In transit', color: Palette.pastelBlue },
  received: { label: 'Received', color: Palette.pastelGreen },
  qc_downgraded: { label: 'Awaiting parent', color: Palette.pastelPink },
};

const GRADE_LABELS: Record<string, string> = {
  good: 'Good',
  fair: 'Fair',
  worn: 'Worn',
  unfit: 'Unfit',
};

export default function PendingScreen() {
  const { data, loading, error } = useSubscription<AdminPendingRequestsData>(
    ADMIN_PENDING_REQUESTS_SUBSCRIPTION,
  );

  const requests = data?.return_requests ?? [];

  return (
    <ScreenContainer>
      <PageTitle
        title="Pending QC"
        subtitle="Review parent-submitted returns and approve refurb / trade-in / donate paths."
      />

      {error ? (
        <Card style={styles.errorCard}>
          <Text style={styles.errorTitle}>Live updates unavailable</Text>
          <Text style={styles.errorBody}>{error.message}</Text>
        </Card>
      ) : null}

      {loading && !data ? (
        <Text style={styles.helperText}>Listening for submissions…</Text>
      ) : null}

      {!loading && requests.length === 0 ? (
        <EmptyState
          title="Inbox is clear"
          subtitle="When parents submit a return, it shows up here within a second."
        />
      ) : null}

      <View style={styles.list}>
        {requests.map((req) => (
          <PendingRow key={req.id} request={req} />
        ))}
      </View>
    </ScreenContainer>
  );
}

function PendingRow({ request }: { request: AdminPendingRequest }) {
  const path = PATH_LABELS[request.path] ?? PATH_LABELS.refurb;
  const status = STATUS_LABELS[request.status] ?? {
    label: request.status,
    color: Palette.bgSubtle,
  };
  const photos = request.condition_assessments[0]?.assessment_photos ?? [];
  const declared = request.self_declared_grade
    ? GRADE_LABELS[request.self_declared_grade] ?? request.self_declared_grade
    : null;

  return (
    <Link
      href={{ pathname: '/(admin)/qc/[id]', params: { id: request.id } }}
      asChild>
      <Pressable>
        <Card style={styles.card}>
          <View style={styles.headerRow}>
            <Image
              source={
                request.owned_unit.product.hero_image_url
                  ? { uri: request.owned_unit.product.hero_image_url }
                  : undefined
              }
              style={styles.thumb}
            />
            <View style={styles.titleBlock}>
              <Text style={styles.product} numberOfLines={1}>
                {request.owned_unit.product.title}
              </Text>
              <Text style={styles.parent} numberOfLines={1}>
                {request.account.display_name}
              </Text>
              <Text style={styles.time}>
                {formatDistanceToNow(new Date(request.created_at), {
                  addSuffix: true,
                })}
              </Text>
            </View>
          </View>

          <View style={styles.pillRow}>
            <Pill label={path.label} background={path.color} />
            <Pill label={status.label} background={status.color} />
            {declared ? (
              <Pill
                label={`Self: ${declared}`}
                background={Palette.bgSubtle}
                textColor={Palette.textSecondary}
              />
            ) : null}
          </View>

          {photos.length ? (
            <View style={styles.photos}>
              <QcPhotoGallery photos={photos} size="sm" />
            </View>
          ) : null}
        </Card>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.md },
  card: { gap: Spacing.md, padding: Spacing.base },
  headerRow: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center' },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: Radius.md,
    backgroundColor: Palette.bgSubtle,
  },
  titleBlock: { flex: 1, gap: 2 },
  product: {
    fontSize: Typography.bodyLg,
    fontWeight: Typography.bold as '700',
    color: Palette.textPrimary,
  },
  parent: {
    fontSize: Typography.body,
    color: Palette.textSecondary,
  },
  time: {
    fontSize: Typography.caption,
    color: Palette.textMuted,
  },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  photos: { marginTop: Spacing.xs },
  errorCard: {
    backgroundColor: Palette.pastelPink,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  errorTitle: {
    fontWeight: Typography.bold as '700',
    color: Palette.textPrimary,
  },
  errorBody: {
    color: Palette.textSecondary,
    fontSize: Typography.caption,
  },
  helperText: {
    fontSize: Typography.body,
    color: Palette.textMuted,
    paddingVertical: Spacing.lg,
    textAlign: 'center',
  },
});
