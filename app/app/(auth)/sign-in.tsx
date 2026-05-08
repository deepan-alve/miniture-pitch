import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSignInEmailPassword } from '@nhost/react';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Input } from '@/components/input';
import { ScreenContainer } from '@/components/screen-container';
import { Palette, Spacing, Typography } from '@/constants/theme';

const DEMO_ACCOUNTS = [
  { email: 'josh.parent@miniture.demo', label: "Josh's Parent (multi-kid)" },
  { email: 'maya.mom@miniture.demo', label: "Maya's Mom (aged-out)" },
  { email: 'ops@miniture.demo', label: 'Ops Admin' },
];

const DEMO_PASSWORD = 'minituredemo123';

export default function SignInScreen() {
  const router = useRouter();
  const { signInEmailPassword, isLoading, isSuccess, isError, error } = useSignInEmailPassword();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (isSuccess) router.replace('/');
  }, [isSuccess, router]);

  const onSubmit = () => {
    if (!email.trim() || !password) return;
    signInEmailPassword(email.trim(), password);
  };

  return (
    <ScreenContainer contentStyle={styles.body}>
      <View style={styles.headWrap}>
        <Text style={styles.brand}>Miniture</Text>
        <Text style={styles.tagline}>Welcome back</Text>
      </View>

      <Card>
        <View style={styles.form}>
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
          />
          {isError && error ? <Text style={styles.error}>{error.message}</Text> : null}
          <Button label="Sign in" loading={isLoading} onPress={onSubmit} />
          <Pressable onPress={() => router.replace('/sign-up')}>
            <Text style={styles.link}>New to Miniture? Create an account</Text>
          </Pressable>
        </View>
      </Card>

      <Card style={styles.hintCard}>
        <Text style={styles.hintTitle}>Demo accounts</Text>
        <Text style={styles.hintBody}>
          Tap any below to fill the form. Password for all is{' '}
          <Text style={styles.code}>{DEMO_PASSWORD}</Text>.
        </Text>
        {DEMO_ACCOUNTS.map((a) => (
          <Pressable
            key={a.email}
            onPress={() => {
              setEmail(a.email);
              setPassword(DEMO_PASSWORD);
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
  tagline: {
    fontSize: Typography.bodyLg,
    color: Palette.textSecondary,
  },
  form: { gap: Spacing.md },
  link: {
    textAlign: 'center',
    color: Palette.orange,
    fontWeight: Typography.semibold as '600',
    fontSize: Typography.body,
    marginTop: Spacing.sm,
  },
  error: {
    fontSize: Typography.body,
    color: Palette.danger,
    textAlign: 'center',
  },
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
