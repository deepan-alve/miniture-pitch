import { useSubscription } from '@apollo/client';
import { format } from 'date-fns';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/card';
import { Pill } from '@/components/pill';
import { ScreenContainer } from '@/components/screen-container';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';
import { RETURN_REQUEST_TIMELINE_SUBSCRIPTION } from '@/graphql/operations/return-requests';

// Live subscription that the demo will sit on while the admin clicks approve.
// Each `return_request_events` row appears in the timeline as it's appended;
// the status pill at the top updates from the joined `return_requests` row.

type EventRow = {
  id: string;
  event_type: string;
  payload: Record<string, unknown> | null;
  created_at: string;
};

type ReturnRequestRow = {
  id: string;
  status: string;
  path: 'refurb' | 'trade_in' | 'donate';
  self_declared_grade: 'good' | 'fair' | 'worn' | null;
  pickup_scheduled_for: string | null;
  pickup_qr_code: string | null;
  created_at: string;
  updated_at: string;
  owned_unit: {
    id: string;
    product: {
      id: string;
      title: string;
      hero_image_url: string | null;
      price_inr: number;
    };
  } | null;
  return_request_events: EventRow[];
};

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  pickup_scheduled: 'Pickup scheduled',
  in_transit: 'In transit',
  received: 'Received at warehouse',
  qc_passed: 'QC passed',
  qc_downgraded: 'QC downgraded — your action needed',
  qc_failed: 'QC failed',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const PATH_LABEL: Record<ReturnRequestRow['path'], string> = {
  refurb: 'Refurb / cash credit',
  trade_in: 'Trade-in bonus',
  donate: 'Donation',
};

const EVENT_LABEL: Record<string, string> = {
  submitted: 'Request submitted',
  pickup_scheduled: 'Pickup scheduled',
  picked_up: 'Picked up',
  in_transit: 'In transit',
  received: 'Received at warehouse',
  qc_started: 'QC started',
  qc_passed: 'QC passed',
  qc_downgraded: 'QC downgraded',
  qc_failed: 'QC failed',
  credit_issued: 'Credit issued',
  trade_in_issued: 'Trade-in credit issued',
  donation_completed: 'Donated to NGO',
  completed: 'All done',
  cancelled: 'Cancelled',
};

export default function ReturnTrackScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, loading } = useSubscription<{
    return_requests_by_pk: ReturnRequestRow | null;
  }>(RETURN_REQUEST_TIMELINE_SUBSCRIPTION, { variables: { id }, skip: !id });

  const req = data?.return_requests_by_pk;

  if (loading && !req) {
    return (
      <ScreenContainer>
        <Text style={styles.loading}>Connecting to live updates...</Text>
      </ScreenContainer>
    );
  }

  if (error || !req) {
    return (
      <ScreenContainer>
        <Text style={styles.loading}>
          Could not load this request{error ? `: ${error.message}` : ''}.
        </Text>
      </ScreenContainer>
    );
  }

  const events = req.return_request_events ?? [];

  return (
    <ScreenContainer>
      <Card style={styles.heroCard}>
        <View style={styles.heroHead}>
          {req.owned_unit?.product.hero_image_url ? (
            <Image
              source={{ uri: req.owned_unit.product.hero_image_url }}
              style={styles.heroImage}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.heroImage, { backgroundColor: Palette.pastelPeach }]} />
          )}
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.heroTitle} numberOfLines={2}>
              {req.owned_unit?.product.title ?? 'Return request'}
            </Text>
            <Text style={styles.heroPath}>{PATH_LABEL[req.path]}</Text>
            <Pill
              label={STATUS_LABEL[req.status] ?? req.status}
              background={Palette.pastelGreen}
              dotColor={Palette.success}
            />
          </View>
        </View>

        {req.pickup_scheduled_for ? (
          <Text style={styles.heroMeta}>
            Pickup: {format(new Date(req.pickup_scheduled_for), 'EEE, MMM d · h:mm a')}
          </Text>
        ) : null}
      </Card>

      <Text style={styles.sectionLabel}>Timeline</Text>

      <View style={styles.timeline}>
        {events.map((ev, idx) => {
          const last = idx === events.length - 1;
          return (
            <View key={ev.id} style={styles.tlRow}>
              <View style={styles.tlAxis}>
                <View
                  style={[
                    styles.tlDot,
                    { backgroundColor: last ? Palette.orange : Palette.success },
                  ]}
                />
                {!last ? <View style={styles.tlLine} /> : null}
              </View>
              <View style={styles.tlBody}>
                <Text style={styles.tlTitle}>
                  {EVENT_LABEL[ev.event_type] ?? ev.event_type.replace(/_/g, ' ')}
                </Text>
                <Text style={styles.tlMeta}>
                  {format(new Date(ev.created_at), "MMM d · h:mm a")}
                </Text>
                {ev.payload && Object.keys(ev.payload).length > 0 ? (
                  <Text style={styles.tlPayload}>{JSON.stringify(ev.payload)}</Text>
                ) : null}
              </View>
            </View>
          );
        })}
        {events.length === 0 ? (
          <Text style={styles.tlEmpty}>Waiting for the first event...</Text>
        ) : null}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    fontSize: Typography.body,
    color: Palette.textSecondary,
  },
  heroCard: { gap: Spacing.md },
  heroHead: { flexDirection: 'row', gap: Spacing.md },
  heroImage: {
    width: 80,
    height: 80,
    borderRadius: Radius.md,
    backgroundColor: Palette.bgSubtle,
  },
  heroTitle: {
    fontSize: Typography.subhead,
    fontWeight: Typography.bold as '700',
    color: Palette.textPrimary,
  },
  heroPath: {
    fontSize: Typography.body,
    color: Palette.textSecondary,
    marginBottom: Spacing.xs,
  },
  heroMeta: {
    fontSize: Typography.body,
    color: Palette.textSecondary,
  },
  sectionLabel: {
    fontSize: Typography.caption,
    color: Palette.textSecondary,
    fontWeight: Typography.bold as '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  timeline: { gap: Spacing.lg },
  tlRow: { flexDirection: 'row', gap: Spacing.md },
  tlAxis: { width: 16, alignItems: 'center' },
  tlDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginTop: 2,
  },
  tlLine: {
    width: 2,
    flex: 1,
    backgroundColor: Palette.border,
    marginTop: 2,
  },
  tlBody: { flex: 1, gap: 2, paddingBottom: Spacing.md },
  tlTitle: {
    fontSize: Typography.bodyLg,
    fontWeight: Typography.semibold as '600',
    color: Palette.textPrimary,
  },
  tlMeta: {
    fontSize: Typography.caption,
    color: Palette.textMuted,
  },
  tlPayload: {
    fontSize: Typography.caption,
    color: Palette.textSecondary,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  tlEmpty: {
    fontSize: Typography.body,
    color: Palette.textMuted,
    fontStyle: 'italic',
  },
});
