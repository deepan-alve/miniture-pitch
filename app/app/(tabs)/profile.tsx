import { useQuery } from '@apollo/client';
import { Link, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSignOut, useUserData } from '@nhost/react';

import { Card } from '@/components/card';
import { Currency } from '@/components/currency';
import { Pill } from '@/components/pill';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';
import { ACCOUNT_OWNED_COUNT_QUERY } from '@/graphql/operations/account';
import { CREDIT_BALANCE_QUERY } from '@/graphql/operations/credit';
import { useCurrentAccount } from '@/hooks/use-current-account';

// Profile tab — host of the buyback flow entry point. The "My Products" row
// is where a parent kicks off return / donate / trade-in.

const ROWS: { label: string; icon: any; href?: string; emphasis?: boolean; key: string }[] = [
  { key: 'my-products', label: 'My Products', icon: 'bag', href: '/my-products', emphasis: true },
  { key: 'credit', label: 'Store Credit', icon: 'gift', href: '/credit' },
  { key: 'orders', label: 'Order History', icon: 'list.bullet' },
  { key: 'children', label: 'Children', icon: 'person' },
  { key: 'settings', label: 'Settings', icon: 'sparkles' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const userData = useUserData();
  const { signOut } = useSignOut();
  const { account, loading } = useCurrentAccount();

  const { data: balData } = useQuery<{ account_credit_balance: { balance_inr: number }[] }>(
    CREDIT_BALANCE_QUERY,
    { variables: { authUserId: userData?.id }, skip: !userData?.id },
  );
  const balance = balData?.account_credit_balance?.[0]?.balance_inr ?? 0;

  const { data: countData } = useQuery<{ owned_units_aggregate: { aggregate: { count: number } } }>(
    ACCOUNT_OWNED_COUNT_QUERY,
    { variables: { authUserId: userData?.id }, skip: !userData?.id },
  );
  const ownedCount = countData?.owned_units_aggregate?.aggregate?.count ?? 0;

  const displayName = account?.display_name ?? userData?.displayName ?? userData?.email ?? '';
  const initial = (displayName || 'M').slice(0, 1).toUpperCase();
  const subline = account
    ? account.child_profiles.length > 1
      ? `Multi-kid family · ${(account.default_address as { city?: string } | null)?.city ?? '—'}`
      : `${(account.default_address as { city?: string } | null)?.city ?? 'Your home'}`
    : userData?.email ?? '';
  const childrenList = account?.child_profiles.map((c) => c.name).join(', ');

  const onSignOut = async () => {
    await signOut();
    router.replace('/sign-in');
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarLetter}>{initial}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>
            {loading && !account ? 'Loading...' : displayName || 'Welcome'}
          </Text>
          {subline ? <Text style={styles.subline}>{subline}</Text> : null}
          {balance > 0 ? (
            <View style={styles.balancePillWrap}>
              <Pill
                label={`store credit`}
                background={Palette.pastelGreen}
                dotColor={Palette.success}
              />
              <Currency amount={balance} style={styles.balanceText} />
            </View>
          ) : null}
        </View>
      </View>

      {childrenList ? (
        <Card style={styles.childrenCard}>
          <Text style={styles.childrenLabel}>Children</Text>
          <Text style={styles.childrenList}>{childrenList}</Text>
        </Card>
      ) : null}

      {ROWS.map((row) => {
        const trailing =
          row.key === 'my-products' && ownedCount > 0
            ? `${ownedCount} item${ownedCount === 1 ? '' : 's'}`
            : null;
        const Body = (
          <View style={[styles.row, row.emphasis ? styles.rowEmphasis : null]}>
            <View style={styles.rowLeft}>
              <View
                style={[
                  styles.rowIconWrap,
                  row.emphasis ? { backgroundColor: Palette.orangeSoft } : null,
                ]}>
                <IconSymbol
                  name={row.icon}
                  size={20}
                  color={row.emphasis ? Palette.orange : Palette.textSecondary}
                />
              </View>
              <Text style={styles.rowLabel}>{row.label}</Text>
            </View>
            <View style={styles.rowRight}>
              {trailing ? <Text style={styles.rowTrailing}>{trailing}</Text> : null}
              <IconSymbol name="chevron.right" size={20} color={Palette.textMuted} />
            </View>
          </View>
        );
        return row.href ? (
          <Link key={row.key} href={row.href as any} asChild>
            <Pressable>{Body}</Pressable>
          </Link>
        ) : (
          <View key={row.key}>{Body}</View>
        );
      })}

      <Pressable style={styles.signOut} onPress={onSignOut}>
        <Text style={styles.signOutLabel}>Sign out</Text>
      </Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
    marginBottom: Spacing.xl,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Palette.pastelBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: Typography.heading,
    fontWeight: Typography.bold as '700',
    color: Palette.bluePrimary,
  },
  name: {
    fontSize: Typography.subhead,
    fontWeight: Typography.bold as '700',
    color: Palette.textPrimary,
  },
  subline: { fontSize: Typography.body, color: Palette.textSecondary, marginTop: 2 },
  balancePillWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  balanceText: {
    fontSize: Typography.body,
    fontWeight: Typography.bold as '700',
    color: Palette.success,
  },
  childrenCard: { marginBottom: Spacing.lg, gap: 4 },
  childrenLabel: {
    fontSize: Typography.caption,
    color: Palette.textSecondary,
    fontWeight: Typography.bold as '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  childrenList: {
    fontSize: Typography.body,
    color: Palette.textPrimary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.bgElevated,
    borderRadius: Radius.card,
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
  },
  rowEmphasis: { backgroundColor: Palette.bgElevated, borderWidth: 1, borderColor: Palette.orange },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  rowIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Palette.bgSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    fontSize: Typography.bodyLg,
    fontWeight: Typography.semibold as '600',
    color: Palette.textPrimary,
  },
  rowTrailing: {
    fontSize: Typography.body,
    color: Palette.textMuted,
    fontWeight: Typography.semibold as '600',
  },
  signOut: {
    marginTop: Spacing.xl,
    paddingVertical: Spacing.base,
    alignItems: 'center',
  },
  signOutLabel: {
    fontSize: Typography.bodyLg,
    fontWeight: Typography.semibold as '600',
    color: Palette.danger,
  },
});
