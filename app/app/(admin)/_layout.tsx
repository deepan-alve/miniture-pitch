import { Tabs, Redirect, usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useUserData, useSignOut, useAuthenticationStatus } from '@nhost/react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { HapticTab } from '@/components/haptic-tab';
import { Palette, Radius, Spacing, Typography } from '@/constants/theme';

// Admin route group — gated to ops users only. Three tabs:
//   1. Pending QC      → /(admin)/pending
//   2. NGO deliveries  → /(admin)/ngo
//   3. Stub log        → /(admin)/stub-log
//
// `qc/[id]` is a Stack screen registered here too so it pushes over the
// tabs without losing the admin chrome.

const OPS_EMAIL = 'ops@miniture.demo';

function isOpsUser(user: ReturnType<typeof useUserData>): boolean {
  if (!user) return false;
  // Preferred: x-hasura-default-role from JWT claims.
  if (user.defaultRole === 'ops' || user.defaultRole === 'admin') return true;
  if (Array.isArray(user.roles) && user.roles.some((r) => r === 'ops' || r === 'admin')) {
    return true;
  }
  // fallback: would gate on x-hasura-role: ops in production
  return user.email === OPS_EMAIL;
}

export default function AdminLayout() {
  const { isAuthenticated, isLoading } = useAuthenticationStatus();
  const user = useUserData();
  const { signOut } = useSignOut();
  const pathname = usePathname();

  if (isLoading) return null;

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (!isOpsUser(user)) {
    return <Redirect href="/(tabs)" />;
  }

  const onQcDetail = pathname.startsWith('/qc/');

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <View style={styles.titleBlock}>
            <Text style={styles.brand}>Miniture Ops</Text>
            <Text style={styles.user}>
              {user?.displayName ?? user?.email ?? 'Operator'}
            </Text>
          </View>
          <Pressable
            onPress={() => {
              void signOut();
            }}
            style={styles.signOutBtn}>
            <IconSymbol name="chevron.right" size={14} color={Palette.textPrimary} />
            <Text style={styles.signOutLabel}>Sign out</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Palette.orange,
          tabBarInactiveTintColor: Palette.textSecondary,
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarStyle: {
            // Hide tabs on the QC detail screen so the focus is on the
            // approve/reject CTAs without bottom-bar competing for attention.
            display: onQcDetail ? 'none' : 'flex',
            backgroundColor: Palette.bgSubtle,
            borderTopWidth: 0,
            paddingTop: Spacing.sm,
            paddingBottom: Spacing.md,
            height: 76,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
          },
        }}>
        <Tabs.Screen
          name="pending"
          options={{
            title: 'Pending QC',
            tabBarIcon: ({ color, size }) => (
              <IconSymbol size={size ?? 24} name="house.fill" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="ngo"
          options={{
            title: 'Donations',
            tabBarIcon: ({ color, size }) => (
              <IconSymbol size={size ?? 24} name="paperplane.fill" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="stub-log"
          options={{
            title: 'Connector',
            tabBarIcon: ({ color, size }) => (
              <IconSymbol size={size ?? 24} name="sparkles" color={color} />
            ),
          }}
        />
        <Tabs.Screen name="qc/[id]" options={{ href: null }} />
        <Tabs.Screen name="index" options={{ href: null }} />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Palette.bg },
  headerSafe: { backgroundColor: Palette.bgElevated },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  titleBlock: { gap: 2 },
  brand: {
    fontSize: Typography.title,
    fontWeight: Typography.bold as '700',
    color: Palette.textPrimary,
    letterSpacing: -0.4,
  },
  user: {
    fontSize: Typography.caption,
    color: Palette.textSecondary,
  },
  signOutBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    backgroundColor: Palette.bgSubtle,
  },
  signOutLabel: {
    fontSize: Typography.body,
    fontWeight: Typography.semibold as '600',
    color: Palette.textPrimary,
  },
});
