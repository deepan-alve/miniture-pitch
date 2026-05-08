import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation } from '@apollo/client';
import { addDays, format, setHours, setMilliseconds, setMinutes, setSeconds } from 'date-fns';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ScreenContainer } from '@/components/screen-container';
import { Palette, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { FUNCTIONS_BASE } from '@/lib/env';
import { useCurrentAccount } from '@/hooks/use-current-account';
import { useReturnFlow } from '@/hooks/use-return-flow';
import { INSERT_RETURN_REQUEST_MUTATION } from '@/graphql/operations/return-requests';

type Slot = { id: string; label: string; iso: string };

function buildSlots(): Slot[] {
  const tomorrow = addDays(new Date(), 1);
  const dayAfter = addDays(new Date(), 2);
  const at = (d: Date, hour: number) =>
    setMilliseconds(setSeconds(setMinutes(setHours(d, hour), 0), 0), 0).toISOString();
  return [
    { id: 'tom-am', label: 'Tomorrow morning (9 AM – 12 PM)', iso: at(tomorrow, 9) },
    { id: 'tom-pm', label: 'Tomorrow evening (4 – 7 PM)', iso: at(tomorrow, 16) },
    { id: 'day-after-am', label: 'Day after morning (9 AM – 12 PM)', iso: at(dayAfter, 9) },
  ];
}

type Address = {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
};

export default function ReturnConfirmScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const flow = useReturnFlow();
  const { account } = useCurrentAccount();

  const slots = useMemo(buildSlots, []);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(slots[0] ?? null);
  const [submitting, setSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const [insertReturnRequest] = useMutation(INSERT_RETURN_REQUEST_MUTATION);

  const address = (account?.default_address as Address | null | undefined) ?? null;

  const onSubmit = async () => {
    if (!id || !flow.path || !flow.grade || !selectedSlot || !account) {
      setErrorText('Missing details — go back and complete each step.');
      return;
    }
    setSubmitting(true);
    setErrorText(null);

    // Try the Function first; fall back to a direct Hasura mutation if the
    // Function isn't deployed (404 / network error / non-2xx).
    // TODO: drop the fallback once `submit-return-request` Function is live.
    let returnId: string | null = null;
    try {
      const res = await fetch(`${FUNCTIONS_BASE}/submit-return-request`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          owned_unit_id: id,
          path: flow.path,
          grade: flow.grade,
          pickup_scheduled_for: selectedSlot.iso,
        }),
      });
      if (res.ok) {
        const json: { id?: string } = await res.json();
        if (json?.id) returnId = json.id;
      }
    } catch {
      // Function unreachable — fall through to mutation
    }

    if (!returnId) {
      try {
        const result = await insertReturnRequest({
          variables: {
            ownedUnitId: id,
            accountId: account.id,
            path: flow.path,
            grade: flow.grade,
            pickupAddress: address,
            pickupScheduledFor: selectedSlot.iso,
          },
        });
        const created = result.data?.insert_return_requests_one;
        if (created?.id) returnId = created.id;
        else throw new Error('No id returned from mutation');
      } catch (err) {
        setSubmitting(false);
        setErrorText((err as Error).message);
        return;
      }
    }

    flow.setPickupSlotIso(selectedSlot.iso);
    setSubmitting(false);
    router.replace(`/return/${returnId}/success` as any);
  };

  return (
    <ScreenContainer>
      <Text style={styles.headline}>Schedule pickup</Text>
      <Text style={styles.lead}>Pick a slot. Our courier will scan a QR code at your door.</Text>

      <Text style={styles.sectionLabel}>Pickup address</Text>
      <Card style={styles.addressCard}>
        {address ? (
          <>
            {address.line1 ? <Text style={styles.addressLine}>{address.line1}</Text> : null}
            {address.line2 ? <Text style={styles.addressLine}>{address.line2}</Text> : null}
            <Text style={styles.addressLine}>
              {[address.city, address.state, address.pincode].filter(Boolean).join(', ')}
            </Text>
          </>
        ) : (
          <Text style={styles.addressLine}>(Default address will be used)</Text>
        )}
      </Card>

      <Text style={styles.sectionLabel}>Pick a slot</Text>
      <View style={styles.slots}>
        {slots.map((s) => {
          const active = selectedSlot?.id === s.id;
          return (
            <Pressable
              key={s.id}
              onPress={() => setSelectedSlot(s)}
              style={[styles.slot, active ? styles.slotActive : null]}>
              <View style={[styles.radio, active ? styles.radioActive : null]}>
                {active ? <View style={styles.radioDot} /> : null}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.slotLabel}>{s.label}</Text>
                <Text style={styles.slotMeta}>
                  {format(new Date(s.iso), 'EEE, MMM d')}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {errorText ? <Text style={styles.error}>{errorText}</Text> : null}

      <View style={styles.cta}>
        <Button label="Confirm pickup" loading={submitting} onPress={onSubmit} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headline: {
    fontSize: Typography.heading,
    fontWeight: Typography.bold as '700',
    color: Palette.textPrimary,
    marginBottom: Spacing.xs,
  },
  lead: {
    fontSize: Typography.body,
    color: Palette.textSecondary,
    marginBottom: Spacing.xl,
    lineHeight: 20,
  },
  sectionLabel: {
    fontSize: Typography.caption,
    color: Palette.textSecondary,
    fontWeight: Typography.bold as '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  addressCard: { marginBottom: Spacing.xl, gap: 2 },
  addressLine: {
    fontSize: Typography.body,
    color: Palette.textPrimary,
  },
  slots: { gap: Spacing.sm },
  slot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Palette.bgElevated,
    borderRadius: Radius.card,
    padding: Spacing.lg,
    borderWidth: 2,
    borderColor: Palette.border,
  },
  slotActive: { borderColor: Palette.black, ...Shadows.card },
  slotLabel: {
    fontSize: Typography.bodyLg,
    fontWeight: Typography.semibold as '600',
    color: Palette.textPrimary,
  },
  slotMeta: {
    fontSize: Typography.caption,
    color: Palette.textMuted,
    marginTop: 2,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Palette.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: Palette.black },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Palette.black,
  },
  error: {
    fontSize: Typography.body,
    color: Palette.danger,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  cta: { marginTop: Spacing.xl },
});
