import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSubscription } from '@apollo/client';
import { format } from 'date-fns';

import { ScreenContainer } from '@/components/screen-container';
import { Card } from '@/components/card';
import { OpBadge } from '@/components/admin/op-badge';
import { JsonPreview } from '@/components/admin/json-preview';
import { EmptyState } from '@/components/admin/_primitives';
import {
  ADMIN_STUB_LOG_SUBSCRIPTION,
  AdminStubLogData,
  AdminStubLogRow,
} from '@/graphql/operations/admin';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';

// Live tail of the Shopify connector. THE wow moment of the demo:
// when the admin clicks Approve in the QC screen, a `createRenewedProduct`
// row appears here in real time. Reviewer instantly grasps the connector
// boundary story.

export default function StubLogScreen() {
  const { data, loading, error } = useSubscription<AdminStubLogData>(
    ADMIN_STUB_LOG_SUBSCRIPTION,
  );

  const rows = data?.shopify_stub_log ?? [];
  // Track which row IDs we've already animated so subsequent renders don't
  // re-pulse them.
  const seenIds = useRef<Set<string>>(new Set());

  return (
    <ScreenContainer>
      <View style={styles.titleBlock}>
        <Text style={styles.title}>Connector activity (live)</Text>
        <Text style={styles.subtitle}>
          Every Shopify-bound call appears here. In production this is just
          an internal audit log.
        </Text>
      </View>

      {error ? (
        <Card style={styles.errorCard}>
          <Text style={styles.errorText}>{error.message}</Text>
        </Card>
      ) : null}

      {loading && !data ? (
        <Text style={styles.helper}>Connecting…</Text>
      ) : null}

      {!loading && rows.length === 0 ? (
        <EmptyState
          title="Quiet on the wire"
          subtitle="Approve a return on the QC tab to see the connector fire."
        />
      ) : null}

      <View style={styles.list}>
        {rows.map((row) => {
          const isNew = !seenIds.current.has(row.id);
          if (isNew) seenIds.current.add(row.id);
          return <StubLogRow key={row.id} row={row} animateIn={isNew && !loading} />;
        })}
      </View>
    </ScreenContainer>
  );
}

function StubLogRow({
  row,
  animateIn,
}: {
  row: AdminStubLogRow;
  animateIn: boolean;
}) {
  const glow = useRef(new Animated.Value(animateIn ? 1 : 0)).current;
  const ranRef = useRef(false);

  useEffect(() => {
    if (!animateIn || ranRef.current) return;
    ranRef.current = true;
    Animated.timing(glow, {
      toValue: 0,
      duration: 2000,
      useNativeDriver: false,
    }).start();
  }, [animateIn, glow]);

  const glowStyle = {
    backgroundColor: glow.interpolate({
      inputRange: [0, 1],
      outputRange: [Palette.bgElevated, Palette.pastelYellow],
    }),
    borderColor: glow.interpolate({
      inputRange: [0, 1],
      outputRange: [Palette.border, Palette.orange],
    }),
  };

  return (
    <Animated.View style={[styles.row, glowStyle]}>
      <View style={styles.rowTop}>
        <OpBadge operation={row.operation} />
        <View style={styles.statusBlock}>
          {row.ok ? (
            <Text style={styles.okMark}>✓</Text>
          ) : (
            <Text style={styles.errMark}>✕</Text>
          )}
          <Text style={styles.timestamp}>
            {format(new Date(row.created_at), 'HH:mm:ss.SSS')}
          </Text>
          {row.duration_ms != null ? (
            <Text style={styles.duration}>{row.duration_ms}ms</Text>
          ) : null}
        </View>
      </View>

      {row.error_message ? (
        <Text style={styles.errMsg}>{row.error_message}</Text>
      ) : null}

      <JsonPreview label="request" value={row.request_payload} />
      <JsonPreview label="response" value={row.response_payload} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  titleBlock: { gap: Spacing.xs, marginBottom: Spacing.md },
  title: {
    fontSize: Typography.heading,
    fontWeight: Typography.bold as '700',
    color: Palette.textPrimary,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: Typography.body,
    color: Palette.textSecondary,
  },
  list: { gap: Spacing.sm },
  row: {
    backgroundColor: Palette.bgElevated,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  statusBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  okMark: {
    color: Palette.success,
    fontSize: Typography.subhead,
    fontWeight: Typography.bold as '700',
  },
  errMark: {
    color: Palette.danger,
    fontSize: Typography.subhead,
    fontWeight: Typography.bold as '700',
  },
  timestamp: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: Palette.textSecondary,
  },
  duration: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: Palette.textMuted,
  },
  errMsg: {
    fontSize: Typography.caption,
    color: Palette.danger,
    fontStyle: 'italic',
  },
  errorCard: {
    backgroundColor: Palette.pastelPink,
    marginBottom: Spacing.md,
  },
  errorText: { color: Palette.danger, fontSize: Typography.caption },
  helper: {
    fontSize: Typography.body,
    color: Palette.textMuted,
    paddingVertical: Spacing.lg,
    textAlign: 'center',
  },
});
