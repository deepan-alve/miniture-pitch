import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import { formatDistanceToNow } from 'date-fns';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Pill } from '@/components/pill';
import { SegmentedControl } from '@/components/segmented-control';
import { Input } from '@/components/admin/_primitives';
import { QcPhotoGallery } from '@/components/admin/qc-photo-gallery';
import { RequestTimeline } from '@/components/admin/request-timeline';
import {
  ADMIN_QC_DETAIL_QUERY,
  ADMIN_APPROVE_QC_REFURB_MUTATION,
  ADMIN_APPROVE_QC_TRADE_IN_MUTATION,
  ADMIN_APPROVE_QC_DONATE_MUTATION,
  ADMIN_REJECT_QC_MUTATION,
  ADMIN_FIRST_ACTIVE_NGO_QUERY,
  AdminQcDetailData,
} from '@/graphql/operations/admin';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';

// QC review/approve detail screen.
//
// IMPORTANT: this is the demo's "wow" hand-off. When the admin clicks
// "Approve QC", the parent's phone — subscribed to return_request_events
// — updates instantly. Make sure every approve path INSERTs into
// return_request_events (the mutations do).
//
// TODO: swap to `approve-qc` Function once deployed. The current chain is
// a faithful client-side reproduction of the same writes.

type Grade = 'good' | 'fair' | 'worn' | 'unfit';

const GRADE_OPTIONS: { value: Grade; label: string }[] = [
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'worn', label: 'Worn' },
  { value: 'unfit', label: 'Unfit' },
];

const PATH_LABEL: Record<string, string> = {
  refurb: 'Refurb',
  trade_in: 'Trade-in',
  donate: 'Donate',
};

// Conservative payout schedule. Mirrors what the consumer side shows so
// the parent's "you'll get X" matches what ops sees.
function computePayout(
  originalPriceInr: number,
  verifiedGrade: Grade,
  path: 'refurb' | 'trade_in' | 'donate',
): { listedPrice: number; credit: number } {
  if (path === 'donate') return { listedPrice: 0, credit: 0 };
  const refurbMultipliers: Record<Grade, number> = {
    good: 0.55,
    fair: 0.4,
    worn: 0.25,
    unfit: 0,
  };
  const tradeBonus = path === 'trade_in' ? 1.25 : 1;
  const baseCredit = Math.round(
    originalPriceInr * refurbMultipliers[verifiedGrade] * tradeBonus,
  );
  const listedPrice = Math.round(originalPriceInr * 0.65);
  return { listedPrice, credit: baseCredit };
}

export default function QcDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const client = useApolloClient();

  const { data, loading, error } = useQuery<AdminQcDetailData>(
    ADMIN_QC_DETAIL_QUERY,
    { variables: { id }, fetchPolicy: 'cache-and-network' },
  );

  const [verifiedGrade, setVerifiedGrade] = useState<Grade>('good');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [approveRefurb] = useMutation(ADMIN_APPROVE_QC_REFURB_MUTATION);
  const [approveTradeIn] = useMutation(ADMIN_APPROVE_QC_TRADE_IN_MUTATION);
  const [approveDonate] = useMutation(ADMIN_APPROVE_QC_DONATE_MUTATION);
  const [rejectQc] = useMutation(ADMIN_REJECT_QC_MUTATION);

  const request = data?.return_requests_by_pk;

  const selfDeclared = useMemo(
    () => request?.condition_assessments.find((a) => a.phase === 'self_declared'),
    [request],
  );
  const verified = useMemo(
    () => request?.condition_assessments.find((a) => a.phase === 'qc_verified'),
    [request],
  );
  const photos = selfDeclared?.assessment_photos ?? [];

  const alreadyDecided =
    request &&
    ['qc_passed', 'qc_failed', 'completed', 'cancelled'].includes(request.status);

  const payout = request
    ? computePayout(request.owned_unit.product.price_inr, verifiedGrade, request.path)
    : { listedPrice: 0, credit: 0 };

  async function handleApprove() {
    if (!request) return;
    if (verifiedGrade === 'unfit') {
      void handleReject();
      return;
    }
    setSubmitting(true);
    try {
      const stubGid = `gid://shopify/Product/renewed-${request.id.slice(0, 8)}`;
      const stubTitle = `${request.owned_unit.product.title} — Renewed (${verifiedGrade})`;
      const stubPriceStr = String(payout.listedPrice);
      const requestPayload = {
        title: stubTitle,
        productType: 'Renewed',
        tags: ['renewed', 'buyback', verifiedGrade],
        variants: [
          {
            price: { amount: stubPriceStr, currencyCode: 'INR' },
            inventoryQuantities: 1,
          },
        ],
      };
      const responsePayload = {
        product: {
          id: stubGid,
          title: stubTitle,
          status: 'ACTIVE',
        },
        userErrors: [],
      };

      if (request.path === 'refurb') {
        await approveRefurb({
          variables: {
            return_request_id: request.id,
            account_id: request.account.id,
            owned_unit_id: request.owned_unit.id,
            original_product_id: request.owned_unit.product.id,
            verified_grade: verifiedGrade,
            notes: notes || null,
            listed_price_inr: payout.listedPrice,
            credit_amount_inr: payout.credit,
            shopify_gid: stubGid,
            shopify_title: stubTitle,
            shopify_price_str: stubPriceStr,
            stub_request_payload: requestPayload,
            stub_response_payload: responsePayload,
          },
        });
      } else if (request.path === 'trade_in') {
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 12);
        await approveTradeIn({
          variables: {
            return_request_id: request.id,
            account_id: request.account.id,
            owned_unit_id: request.owned_unit.id,
            original_product_id: request.owned_unit.product.id,
            verified_grade: verifiedGrade,
            notes: notes || null,
            listed_price_inr: payout.listedPrice,
            credit_amount_inr: payout.credit,
            expires_at: expiresAt.toISOString(),
            shopify_gid: stubGid,
            shopify_title: stubTitle,
            shopify_price_str: stubPriceStr,
            stub_request_payload: requestPayload,
            stub_response_payload: responsePayload,
          },
        });
      } else {
        const ngoResp = await client.query({
          query: ADMIN_FIRST_ACTIVE_NGO_QUERY,
          fetchPolicy: 'network-only',
        });
        const ngoId = ngoResp.data?.ngo_partners?.[0]?.id;
        if (!ngoId) throw new Error('No active NGO partner configured');
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 6);
        const code = `THANKS-${request.id.slice(0, 6).toUpperCase()}`;
        const discountGid = `gid://shopify/DiscountCodeNode/${request.id.slice(0, 8)}`;
        const dcRequest = {
          basicCodeDiscount: {
            code,
            customerSelection: { customers: { add: [request.account.id] } },
            customerGets: { value: { percentage: 0.15 } },
          },
        };
        const dcResponse = {
          codeDiscountNode: { id: discountGid, codeDiscount: { code } },
          userErrors: [],
        };
        await approveDonate({
          variables: {
            return_request_id: request.id,
            account_id: request.account.id,
            owned_unit_id: request.owned_unit.id,
            verified_grade: verifiedGrade,
            notes: notes || null,
            ngo_partner_id: ngoId,
            discount_code: code,
            discount_pct: 15,
            discount_expires_at: expiresAt.toISOString(),
            shopify_discount_gid: discountGid,
            stub_request_payload: dcRequest,
            stub_response_payload: dcResponse,
          },
        });
      }

      Alert.alert(
        'QC approved',
        request.path === 'donate'
          ? 'Discount code issued, donation logged.'
          : `Credit of ₹${payout.credit.toLocaleString('en-IN')} issued.`,
      );
      router.back();
    } catch (e) {
      console.error(e);
      Alert.alert('Approval failed', e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject() {
    if (!request) return;
    setSubmitting(true);
    try {
      await rejectQc({
        variables: {
          return_request_id: request.id,
          owned_unit_id: request.owned_unit.id,
          notes: notes || 'Marked unfit by ops',
          payload: { reason: 'unfit', notes: notes || null },
        },
      });
      Alert.alert(
        'Marked unfit',
        'No credit issued. The unit returns to the parent.',
      );
      router.back();
    } catch (e) {
      console.error(e);
      Alert.alert('Reject failed', e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.root}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'QC review',
          headerTitleStyle: { fontWeight: '700' },
          headerStyle: { backgroundColor: Palette.bg },
        }}
      />
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}>
        {loading && !request ? (
          <Text style={styles.helper}>Loading…</Text>
        ) : null}

        {error ? (
          <Card style={styles.errorCard}>
            <Text style={styles.errorText}>{error.message}</Text>
          </Card>
        ) : null}

        {request ? (
          <>
            {/* Parent + product summary */}
            <Card style={styles.section}>
              <View style={styles.row}>
                <Text style={styles.sectionLabel}>Parent</Text>
                <Text style={styles.sectionValue}>
                  {request.account.display_name}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.sectionLabel}>Product</Text>
                <Text style={styles.sectionValue}>
                  {request.owned_unit.product.title}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.sectionLabel}>Path</Text>
                <Pill label={PATH_LABEL[request.path] ?? request.path} />
              </View>
              <View style={styles.row}>
                <Text style={styles.sectionLabel}>Submitted</Text>
                <Text style={styles.sectionValue}>
                  {formatDistanceToNow(new Date(request.created_at), {
                    addSuffix: true,
                  })}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.sectionLabel}>Original price</Text>
                <Text style={styles.sectionValue}>
                  ₹{request.owned_unit.product.price_inr.toLocaleString('en-IN')}
                </Text>
              </View>
            </Card>

            {/* Photos */}
            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>Submitted photos</Text>
              <QcPhotoGallery photos={photos} size="md" />
              {selfDeclared?.notes ? (
                <Text style={styles.notes}>Parent note: {selfDeclared.notes}</Text>
              ) : null}
            </Card>

            {/* Self-declared */}
            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>Parent's self-declared grade</Text>
              <Pill
                label={
                  request.self_declared_grade
                    ? request.self_declared_grade.toUpperCase()
                    : selfDeclared?.grade?.toUpperCase() ?? 'Not stated'
                }
                background={Palette.pastelYellow}
              />
            </Card>

            {/* Already decided banner */}
            {alreadyDecided && verified ? (
              <Card style={{ ...styles.section, ...styles.decidedCard }}>
                <Text style={styles.sectionTitle}>Already verified</Text>
                <Text style={styles.helper}>
                  Status: {request.status} · Grade: {verified.grade}
                </Text>
                {verified.notes ? (
                  <Text style={styles.notes}>{verified.notes}</Text>
                ) : null}
              </Card>
            ) : null}

            {/* QC form */}
            {!alreadyDecided ? (
              <Card style={styles.section}>
                <Text style={styles.sectionTitle}>Verify grade</Text>
                <SegmentedControl<Grade>
                  options={GRADE_OPTIONS}
                  value={verifiedGrade}
                  onChange={setVerifiedGrade}
                />
                <Input
                  label="Notes (optional)"
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  placeholder="Missing piece A, scuff on surface, etc."
                />

                {request.path !== 'donate' && verifiedGrade !== 'unfit' ? (
                  <View style={styles.payoutRow}>
                    <Text style={styles.payoutLabel}>Estimated payout</Text>
                    <Text style={styles.payoutValue}>
                      ₹{payout.credit.toLocaleString('en-IN')}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.actions}>
                  <Button
                    label={
                      verifiedGrade === 'unfit'
                        ? 'Mark unfit (no credit)'
                        : 'Approve QC'
                    }
                    variant={verifiedGrade === 'unfit' ? 'secondary' : 'primary'}
                    loading={submitting}
                    onPress={handleApprove}
                  />
                  {verifiedGrade !== 'unfit' ? (
                    <Button
                      label="Mark unfit (recycle)"
                      variant="ghost"
                      style={styles.dangerBtn}
                      onPress={() => {
                        setVerifiedGrade('unfit');
                      }}
                    />
                  ) : null}
                </View>
              </Card>
            ) : null}

            {/* Timeline */}
            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>Timeline</Text>
              <RequestTimeline events={request.return_request_events} />
            </Card>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Palette.bg },
  body: {
    padding: Spacing.lg,
    paddingBottom: Spacing['3xl'],
    gap: Spacing.md,
  },
  section: { gap: Spacing.md },
  sectionTitle: {
    fontSize: Typography.subhead,
    fontWeight: Typography.bold as '700',
    color: Palette.textPrimary,
  },
  sectionLabel: {
    fontSize: Typography.caption,
    color: Palette.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontWeight: Typography.semibold as '600',
  },
  sectionValue: {
    fontSize: Typography.body,
    color: Palette.textPrimary,
    fontWeight: Typography.medium as '500',
    flex: 1,
    textAlign: 'right',
    marginLeft: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notes: {
    fontSize: Typography.body,
    color: Palette.textSecondary,
    fontStyle: 'italic',
  },
  decidedCard: { backgroundColor: Palette.pastelGreen },
  payoutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Palette.pastelGreen,
    borderRadius: Radius.md,
  },
  payoutLabel: {
    fontSize: Typography.body,
    color: Palette.textSecondary,
    fontWeight: Typography.semibold as '600',
  },
  payoutValue: {
    fontSize: Typography.title,
    fontWeight: Typography.bold as '700',
    color: Palette.textPrimary,
  },
  actions: { gap: Spacing.sm },
  dangerBtn: { borderWidth: 0 },
  helper: {
    fontSize: Typography.body,
    color: Palette.textMuted,
    paddingVertical: Spacing.lg,
    textAlign: 'center',
  },
  errorCard: { backgroundColor: Palette.pastelPink },
  errorText: { color: Palette.danger },
});
