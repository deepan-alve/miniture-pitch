import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSignUpEmailPassword, useUserData } from '@nhost/react';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Input } from '@/components/input';
import { ScreenContainer } from '@/components/screen-container';
import { Palette, Spacing, Typography } from '@/constants/theme';
import { FUNCTIONS_BASE } from '@/lib/env';

const DEMO_ACCOUNTS = [
  { email: 'josh.parent@miniture.demo', label: "Josh's Parent (multi-kid)" },
  { email: 'maya.mom@miniture.demo', label: "Maya's Mom (aged-out)" },
  { email: 'ops@miniture.demo', label: 'Ops Admin' },
];

const DEMO_PASSWORD = 'minituredemo123';

export default function SignUpScreen() {
  const router = useRouter();
  const userData = useUserData();
  const { signUpEmailPassword, isLoading, isSuccess, isError, error, needsEmailVerification } =
    useSignUpEmailPassword();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [displayName, setDisplayName] = useState('');
  const syncedRef = useRef(false);

  // After signup the JWT is live and `useUserData()` populates. Hit the
  // sync-account-from-auth Function so demo emails relink to seed accounts.
  // If the Function isn't deployed yet, we silently swallow — the user can
  // still sign in, they'll just see empty My Products until backend lands.
  useEffect(() => {
    if (!isSuccess || !userData?.id || !userData?.email || syncedRef.current) return;
    syncedRef.current = true;

    fetch(`${FUNCTIONS_BASE}/sync-account-from-auth`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: userData.email,
        auth_user_id: userData.id,
      }),
    })
      .catch(() => {
        // TODO: surface a toast once we have a toast primitive.
      })
      .finally(() => {
        router.replace('/');
      });
  }, [isSuccess, userData, router]);

  const onSubmit = () => {
    if (!email.trim() || !password) return;
    signUpEmailPassword(email.trim(), password, {
      displayName: displayName || email.split('@')[0],
    });
  };

  return (
    <ScreenContainer contentStyle={styles.body}>
      <View style={styles.headWrap}>
        <Text style={styles.brand}>Miniture</Text>
        <Text style={styles.tagline}>Create your account</Text>
      </View>

      <Card>
        <View style={styles.form}>
          <Input
            label="Display name"
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your name"
          />
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@miniture.demo"
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            helper="At least 8 characters."
          />
          {isError && error ? <Text style={styles.error}>{error.message}</Text> : null}
          {needsEmailVerification ? (
            <Text style={styles.notice}>Check your inbox to confirm.</Text>
          ) : null}
          <Button label="Create account" loading={isLoading} onPress={onSubmit} />
          <Pressable onPress={() => router.replace('/sign-in')}>
            <Text style={styles.link}>Already have an account? Sign in</Text>
          </Pressable>
        </View>
      </Card>

      <Card style={styles.hintCard}>
        <Text style={styles.hintTitle}>Demo accounts</Text>
        <Text style={styles.hintBody}>
          Use one of these emails to light up the demo data. Password{' '}
          <Text style={styles.code}>{DEMO_PASSWORD}</Text>.
        </Text>
        {DEMO_ACCOUNTS.map((a) => (
          <Pressable
            key={a.email}
            onPress={() => {
              setEmail(a.email);
              setPassword(DEMO_PASSWORD);
              setDisplayName(a.label.split(' (')[0] ?? '');
            }}
            style={styles.hintRow}>
            <Text style={styles.hintEmail}>{a.email}</Text>
            <Text style={styles.hintLabel}>{a.label}</Text>
          </Pressable>
        ))}
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: { paddingTop: Spacing['3xl'], gap: Spacing.xl },
  headWrap: { alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.lg },
  brand: {
    fontSize: Typography.display,
    fontWeight: Typography.extrabold as '800',
    color: Palette.orange,
    letterSpacing: -1,
  },
  tagline: { fontSize: Typography.bodyLg, color: Palette.textSecondary },
  form: { gap: Spacing.md },
  link: {
    textAlign: 'center',
    color: Palette.orange,
    fontWeight: Typography.semibold as '600',
    fontSize: Typography.body,
    marginTop: Spacing.sm,
  },
  error: { fontSize: Typography.body, color: Palette.danger, textAlign: 'center' },
  notice: { fontSize: Typography.body, color: Palette.warning, textAlign: 'center' },
  hintCard: { backgroundColor: Palette.pastelCream, marginTop: Spacing.lg },
  hintTitle: {
    fontSize: Typography.subhead,
    fontWeight: Typography.bold as '700',
    color: Palette.textPrimary,
    marginBottom: Spacing.xs,
  },
  hintBody: {
    fontSize: Typography.body,
    color: Palette.textSecondary,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  code: {
    fontFamily: 'monospace',
    color: Palette.textPrimary,
    backgroundColor: Palette.bgElevated,
    paddingHorizontal: Spacing.xs,
  },
  hintRow: {
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Palette.border,
  },
  hintEmail: {
    fontSize: Typography.body,
    fontWeight: Typography.semibold as '600',
    color: Palette.textPrimary,
  },
  hintLabel: {
    fontSize: Typography.caption,
    color: Palette.textSecondary,
    marginTop: 2,
  },
});
