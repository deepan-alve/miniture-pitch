import { useState } from 'react';
import { Alert, Image, Linking, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useSubscription } from '@apollo/client';
import { differenceInDays, format } from 'date-fns';

import { ScreenContainer } from '@/components/screen-container';
import { PageTitle } from '@/components/page-title';
import { Card } from '@/components/card';
import { Pill } from '@/components/pill';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/admin/_primitives';
import {
  ADMIN_NGO_DELIVERIES_SUBSCRIPTION,
  ADMIN_NGO_RECENT_QUERY,
  ADMIN_CONFIRM_DONATION_MUTATION,
  AdminNgoDelivery,
  AdminNgoDeliveriesData,
} from '@/graphql/operations/admin';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';

// Donation deliveries — pending list (live) and recent history (one-shot).
//
// "Mark delivered" stamps delivered_to_ngo_at + a stub impact certificate
// URL. Production behavior: a Function uploads a PDF to Storage and the
// URL points there. The current behavior is functionally equivalent for
// the demo's narrative.

export default function NgoScreen() {
  const { data: pendingData, loading, error } = useSubscription<AdminNgoDeliveriesData>(
    ADMIN_NGO_DELIVERIES_SUBSCRIPTION,
  );
  const { data: recentData, refetch: refetchRecent } = useQuery(ADMIN_NGO_RECENT_QUERY, {
    fetchPolicy: 'cache-and-network',
  });

  const pending = pendingData?.donation_records ?? [];
  const recent = recentData?.donation_records ?? [];

  return (
    <ScreenContainer>
      <PageTitle
        title="NGO deliveries"
        subtitle="Mark physical hand-offs and issue impact certificates."
      />

      {error ? (
        <Card style={styles.errorCard}>
          <Text style={styles.errorBody}>{error.message}</Text>
        </Card>
      ) : null}

      <Text style={styles.groupHeader}>Pending</Text>
      {loading && !pendingData ? (
        <Text style={styles.helper}>Listening for donations…</Text>
      ) : null}
      {!loading && pending.length === 0 ? (
        <EmptyState
          title="All caught up"
          subtitle="No pending NGO deliveries."
        />
      ) : null}
      <View style={styles.list}>
        {pending.map((row) => (
          <PendingDeliveryCard
            key={row.id}
            delivery={row}
            onConfirmed={() => {
              void refetchRecent();
            }}
          />
        ))}
      </View>

      {recent.length ? (
        <>
          <Text style={[styles.groupHeader, styles.groupHeaderSpaced]}>Recently delivered</Text>
          <View style={styles.list}>
            {recent.map((row: any) => (
              <Card key={row.id} style={styles.recentCard}>
                <View style={styles.recentTitleRow}>
                  <Text style={styles.recentTitle} numberOfLines={1}>
                    {row.return_request.owned_unit.product.title}
                  </Text>
                  <Pill
                    label="Delivered"
                    background={Palette.pastelGreen}
                    dotColor={Palette.success}
                  />
                </View>
                <Text style={styles.recentMeta}>
                  {row.return_request.account.display_name} → {row.ngo_partner.name} ·{' '}
                  {format(new Date(row.delivered_to_ngo_at), 'd MMM')}
                </Text>
                {row.impact_certificate_url ? (
                  <Text
                    style={styles.certLink}
                    onPress={() => {
                      void Linking.openURL(row.impact_certificate_url);
                    }}>
                    View certificate
                  </Text>
                ) : null}
              </Card>
            ))}
          </View>
        </>
      ) : null}
    </ScreenContainer>
  );
}

function PendingDeliveryCard({
  delivery,
  onConfirmed,
}: {
  delivery: AdminNgoDelivery;
  onConfirmed: () => void;
}) {
  const [confirm, { loading }] = useMutation(ADMIN_CONFIRM_DONATION_MUTATION);
  const [done, setDone] = useState<{ url: string; code?: string } | null>(null);

  const days = differenceInDays(new Date(), new Date(delivery.return_request.created_at));
  const daysLabel =
    days <= 0 ? 'Today' : days === 1 ? '1 day waiting' : `${days} days waiting`;

  async function onConfirm() {
    const certUrl = `https://${
      // Cosmetic: a plausible-looking Nhost storage URL. The Function will
      // replace this with the real PDF in production.
      'ntytiuebfzzodrotraun.storage.ap-south-1.nhost.run/v1/files'
    }/impact-certificates/${delivery.id}.pdf`;

    try {
      await confirm({
        variables: {
          donation_id: delivery.id,
          return_request_id: delivery.return_request.id,
          owned_unit_id: delivery.return_request.owned_unit.id,
          impact_certificate_url: certUrl,
          event_payload: {
            ngo: delivery.ngo_partner.name,
            certificate_url: certUrl,
          },
        },
      });
      setDone({ url: certUrl });
      onConfirmed();
      Alert.alert('Marked delivered', `Impact certificate generated for ${delivery.ngo_partner.name}.`);
    } catch (e) {
      Alert.alert('Failed', e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <Image
          source={
            delivery.return_request.owned_unit.product.hero_image_url
              ? { uri: delivery.return_request.owned_unit.product.hero_image_url }
              : undefined
          }
          style={styles.thumb}
        />
        <View style={styles.titleBlock}>
          <Text style={styles.product} numberOfLines={1}>
            {delivery.return_request.owned_unit.product.title}
          </Text>
          <Text style={styles.parent}>
            {delivery.return_request.account.display_name}
          </Text>
        </View>
      </View>

      <View style={styles.pillRow}>
        <Pill
          label={delivery.ngo_partner.name}
          background={Palette.pastelLavender}
        />
        <Pill
          label={daysLabel}
          background={days >= 7 ? Palette.pastelPeach : Palette.bgSubtle}
          textColor={Palette.textPrimary}
        />
      </View>

      {done ? (
        <View style={styles.doneBox}>
          <Text style={styles.doneTitle}>Delivered</Text>
          <Text
            style={styles.certLink}
            onPress={() => {
              void Linking.openURL(done.url);
            }}>
            View certificate
          </Text>
        </View>
      ) : (
        <Button
          label="Mark delivered"
          variant="primary"
          loading={loading}
          onPress={onConfirm}
        />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.md },
  groupHeader: {
    fontSize: Typography.caption,
    color: Palette.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: Typography.bold as '700',
    marginBottom: Spacing.sm,
  },
  groupHeaderSpaced: { marginTop: Spacing.xl },
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
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  doneBox: {
    backgroundColor: Palette.pastelGreen,
    padding: Spacing.md,
    borderRadius: Radius.md,
    gap: Spacing.xs,
  },
  doneTitle: {
    fontWeight: Typography.bold as '700',
    color: Palette.textPrimary,
  },
  certLink: {
    color: Palette.bluePrimary,
    fontWeight: Typography.semibold as '600',
    fontSize: Typography.body,
  },
  recentCard: { gap: Spacing.xs, padding: Spacing.md },
  recentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  recentTitle: {
    flex: 1,
    fontSize: Typography.bodyLg,
    fontWeight: Typography.semibold as '600',
    color: Palette.textPrimary,
  },
  recentMeta: {
    fontSize: Typography.caption,
    color: Palette.textSecondary,
  },
  errorCard: {
    backgroundColor: Palette.pastelPink,
    marginBottom: Spacing.md,
  },
  errorBody: { color: Palette.textSecondary, fontSize: Typography.caption },
  helper: {
    fontSize: Typography.body,
    color: Palette.textMuted,
    paddingVertical: Spacing.lg,
    textAlign: 'center',
  },
});
