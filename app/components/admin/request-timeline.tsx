import { StyleSheet, Text, View } from 'react-native';
import { formatDistanceToNow } from 'date-fns';

import { Palette, Radius, Spacing, Typography } from '@/constants/theme';

// Vertical stepper showing return_request_events history.
// Mirrors the consumer-side track screen but more compact.

type Event = {
  id: string;
  event_type: string;
  payload: Record<string, unknown> | null;
  created_at: string;
};

type Props = {
  events: Event[];
};

const EVENT_LABELS: Record<string, string> = {
  draft: 'Drafted',
  submitted: 'Submitted',
  pickup_scheduled: 'Pickup scheduled',
  in_transit: 'In transit',
  received: 'Received at warehouse',
  qc_passed: 'QC approved',
  qc_downgraded: 'Grade downgraded',
  qc_failed: 'QC failed (unfit)',
  donation_delivered: 'Delivered to NGO',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const EVENT_DOT_COLOR: Record<string, string> = {
  qc_passed: Palette.success,
  qc_failed: Palette.danger,
  qc_downgraded: Palette.warning,
  cancelled: Palette.danger,
  completed: Palette.success,
  donation_delivered: Palette.success,
};

export function RequestTimeline({ events }: Props) {
  if (!events.length) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyText}>No events yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {events.map((event, idx) => {
        const isLast = idx === events.length - 1;
        const dotColor = EVENT_DOT_COLOR[event.event_type] ?? Palette.orange;
        return (
          <View key={event.id} style={styles.row}>
            <View style={styles.gutter}>
              <View style={[styles.dot, { backgroundColor: dotColor }]} />
              {isLast ? null : <View style={styles.line} />}
            </View>
            <View style={styles.body}>
              <Text style={styles.title}>
                {EVENT_LABELS[event.event_type] ?? event.event_type}
              </Text>
              <Text style={styles.time}>
                {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 0 },
  row: { flexDirection: 'row', gap: Spacing.md },
  gutter: { width: 16, alignItems: 'center' },
  dot: {
    width: 12,
    height: 12,
    borderRadius: Radius.pill,
    marginTop: 4,
  },
  line: {
    width: 2,
    flex: 1,
    minHeight: 24,
    backgroundColor: Palette.border,
    marginTop: 2,
    marginBottom: 2,
  },
  body: { flex: 1, paddingBottom: Spacing.md },
  title: {
    fontSize: Typography.body,
    fontWeight: Typography.semibold as '600',
    color: Palette.textPrimary,
  },
  time: {
    fontSize: Typography.caption,
    color: Palette.textMuted,
    marginTop: 2,
  },
  emptyWrap: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  emptyText: { color: Palette.textMuted, fontSize: Typography.body },
});
