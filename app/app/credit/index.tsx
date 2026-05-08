import { useQuery } from '@apollo/client';
import { format } from 'date-fns';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useUserData } from '@nhost/react';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Currency } from '@/components/currency';
import { Pill } from '@/components/pill';
import { ScreenContainer } from '@/components/screen-container';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';
import {
  CREDIT_BALANCE_QUERY,
  RECENT_LEDGER_QUERY,
} from '@/graphql/operations/credit';

type Balance = { account_id: string; balance_inr: number };
type LedgerRow = {
  id: string;
  amount_inr: number;
  source_type: string;
  source_id: string | null;
  expires_at: string | null;
  created_at: string;
};

const SOURCE_LABEL: Record<string, string> = {
  refurb_payout: 'Refurb credit',
  trade_in_payout: 'Trade-in bonus',
  donate_thank_you: 'Donate thank-you',
  transfer_in: 'Received from a friend',
  transfer_out: 'Sent to a friend',
  redemption: 'Used at checkout',
  expiry: 'Expired credit',
};

export default function CreditScreen() {
  const userData = useUserData();
  const authUserId = userData?.id;

  const { data: balData, loading: balLoading } = useQuery<{
    account_credit_balance: Balance[];
  }>(CREDIT_BALANCE_QUERY, { variables: { authUserId }, skip: !authUserId });
  const { data: ledgerData, loading: ledgerLoading } = useQuery<{
    store_credit_ledger: LedgerRow[];
  }>(RECENT_LEDGER_QUERY, { variables: { authUserId }, skip: !authUserId });

  const balance = balData?.account_credit_balance?.[0]?.balance_inr ?? 0;
  const ledger = ledgerData?.store_credit_ledger ?? [];

  return (
    <ScreenContainer>
      <Card style={styles.heroCard}>
        <Text style={styles.heroLabel}>Available balance</Text>
        <Currency amount={balance} style={styles.heroAmount} />
        <Text style={styles.heroHint}>
          Earned from refurb returns, trade-ins, and gifts. Spend on your next Miniture order.
        </Text>
        <Link href="/credit/transfer" asChild>
          <Pressable>
            <Button label="Send credit" />
          </Pressable>
        </Link>
      </Card>

      <Text style={styles.sectionLabel}>Recent activity</Text>

      {(balLoading || ledgerLoading) && ledger.length === 0 ? (
        <Text style={styles.helper}>Loading credit history...</Text>
      ) : null}

      {ledger.length === 0 && !balLoading && !ledgerLoading ? (
        <Card>
          <Text style={styles.empty}>
            No activity yet. Send your first item back to earn credit.
          </Text>
        </Card>
      ) : null}

      <View style={styles.ledger}>
        {ledger.map((row) => {
          const positive = row.amount_inr > 0;
          return (
            <Card key={row.id} style={styles.ledgerRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.ledgerLabel}>
                  {SOURCE_LABEL[row.source_type] ?? row.source_type.replace(/_/g, ' ')}
                </Text>
                <Text style={styles.ledgerMeta}>
                  {format(new Date(row.created_at), 'MMM d · h:mm a')}
                </Text>
                {row.expires_at ? (
                  <Pill
                    label={`Expires ${format(new Date(row.expires_at), 'MMM yyyy')}`}
                    background={Palette.pastelYellow}
                    dotColor={Palette.warning}
                    style={{ marginTop: Spacing.xs }}
                  />
                ) : null}
              </View>
              <Currency
                amount={row.amount_inr}
                style={[
                  styles.ledgerAmount,
                  { color: positive ? Palette.success : Palette.danger },
                ]}
              />
            </Card>
          );
        })}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: Palette.orange,
    borderColor: Palette.orange,
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  heroLabel: {
    fontSize: Typography.caption,
    color: Palette.textInverse,
    opacity: 0.85,
    fontWeight: Typography.bold as '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroAmount: {
    fontSize: Typography.hero,
    color: Palette.textInverse,
    fontWeight: Typography.extrabold as '800',
    letterSpacing: -1,
  },
  heroHint: {
    fontSize: Typography.body,
    color: Palette.textInverse,
    opacity: 0.85,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  sectionLabel: {
    fontSize: Typography.caption,
    color: Palette.textSecondary,
    fontWeight: Typography.bold as '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: Spacing.md,
  },
  helper: {
    fontSize: Typography.body,
    color: Palette.textSecondary,
  },
  empty: {
    fontSize: Typography.body,
    color: Palette.textSecondary,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
  ledger: { gap: Spacing.sm },
  ledgerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radius.card,
  },
  ledgerLabel: {
    fontSize: Typography.bodyLg,
    fontWeight: Typography.semibold as '600',
    color: Palette.textPrimary,
  },
  ledgerMeta: {
    fontSize: Typography.caption,
    color: Palette.textMuted,
    marginTop: 2,
  },
  ledgerAmount: {
    fontSize: Typography.subhead,
    fontWeight: Typography.bold as '700',
  },
});
