import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import { useRouter } from 'expo-router';
import { useUserData } from '@nhost/react';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Currency } from '@/components/currency';
import { Input } from '@/components/input';
import { ScreenContainer } from '@/components/screen-container';
import { Palette, Spacing, Typography } from '@/constants/theme';
import { FUNCTIONS_BASE } from '@/lib/env';
import { useCurrentAccount } from '@/hooks/use-current-account';
import {
  CREDIT_BALANCE_QUERY,
  INSERT_CREDIT_TRANSFER_MUTATION,
  LOOKUP_ACCOUNT_BY_PHONE_QUERY,
  RECENT_LEDGER_QUERY,
} from '@/graphql/operations/credit';

type Balance = { account_id: string; balance_inr: number };
type LookupResult = { accounts: { id: string; display_name: string; phone: string | null }[] };

export default function TransferCreditScreen() {
  const router = useRouter();
  const userData = useUserData();
  const { account } = useCurrentAccount();
  const apollo = useApolloClient();

  const { data: balData } = useQuery<{ account_credit_balance: Balance[] }>(
    CREDIT_BALANCE_QUERY,
    { variables: { authUserId: userData?.id }, skip: !userData?.id },
  );
  const balance = balData?.account_credit_balance?.[0]?.balance_inr ?? 0;

  const [recipient, setRecipient] = useState('');
  const [amountText, setAmountText] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [insertTransfer] = useMutation(INSERT_CREDIT_TRANSFER_MUTATION);

  const amount = parseInt(amountText.replace(/[^0-9]/g, ''), 10);
  const validAmount = Number.isFinite(amount) && amount > 0;
  const overBalance = validAmount && amount > balance;

  const onSubmit = async () => {
    setError(null);
    if (!account) return;
    if (!recipient.trim()) {
      setError('Enter a phone number to send credit to.');
      return;
    }
    if (!validAmount) {
      setError('Enter a valid amount.');
      return;
    }
    if (overBalance) {
      setError(`You only have ${balance} in store credit.`);
      return;
    }

    setSubmitting(true);

    // Try the Function first.
    // TODO: drop the fallback once `transfer-credit` Function is live.
    let ok = false;
    try {
      const res = await fetch(`${FUNCTIONS_BASE}/transfer-credit`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          recipient: recipient.trim(),
          amount_inr: amount,
          message,
        }),
      });
      if (res.ok) ok = true;
    } catch {
      // Function unreachable
    }

    if (!ok) {
      // Fallback: look up by phone, then run the bundled mutation.
      try {
        const lookup = await apollo.query<LookupResult>({
          query: LOOKUP_ACCOUNT_BY_PHONE_QUERY,
          variables: { phone: recipient.trim() },
          fetchPolicy: 'network-only',
        });
        const recipientAcct = lookup.data.accounts?.[0];
        if (!recipientAcct) {
          setError('No Miniture account found for that phone number.');
          setSubmitting(false);
          return;
        }
        if (recipientAcct.id === account.id) {
          setError('You can’t send credit to yourself.');
          setSubmitting(false);
          return;
        }
        await insertTransfer({
          variables: {
            fromAccountId: account.id,
            toAccountId: recipientAcct.id,
            amount,
            negAmount: -amount,
            message: message || null,
          },
          refetchQueries: [
            { query: CREDIT_BALANCE_QUERY, variables: { authUserId: userData?.id } },
            { query: RECENT_LEDGER_QUERY, variables: { authUserId: userData?.id } },
          ],
        });
        ok = true;
      } catch (err) {
        setError((err as Error).message);
      }
    }

    setSubmitting(false);

    if (ok) {
      Alert.alert('Sent!', `${amount} sent to ${recipient.trim()}.`);
      router.back();
    }
  };

  return (
    <ScreenContainer>
      <Card style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Your balance</Text>
        <Currency amount={balance} style={styles.balanceAmount} />
      </Card>

      <View style={styles.form}>
        <Input
          label="Recipient phone"
          placeholder="+9198xxxxxxxx"
          value={recipient}
          onChangeText={setRecipient}
          autoCapitalize="none"
          keyboardType="phone-pad"
          helper="Their Miniture account is matched by phone number."
        />
        <Input
          label="Amount (INR)"
          placeholder="500"
          value={amountText}
          onChangeText={setAmountText}
          keyboardType="number-pad"
          error={overBalance ? 'Exceeds available balance' : undefined}
        />
        <Input
          label="Message (optional)"
          placeholder="Happy birthday from Aunty!"
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={3}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          label="Send"
          loading={submitting}
          disabled={!recipient.trim() || !validAmount || overBalance}
          onPress={onSubmit}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  balanceCard: {
    backgroundColor: Palette.orangeSoft,
    borderColor: Palette.orange,
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  balanceLabel: {
    fontSize: Typography.caption,
    color: Palette.textSecondary,
    fontWeight: Typography.bold as '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  balanceAmount: {
    fontSize: Typography.display,
    fontWeight: Typography.extrabold as '800',
    color: Palette.orange,
    letterSpacing: -1,
    marginTop: Spacing.xs,
  },
  form: { gap: Spacing.md },
  error: {
    fontSize: Typography.body,
    color: Palette.danger,
    textAlign: 'center',
  },
});
