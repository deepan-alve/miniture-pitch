import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuthenticationStatus } from '@nhost/react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Palette, Radius, Spacing } from '@/constants/theme';

// Five-tab structure matches Miniture's app exactly so the buyback feature
// (in Profile / My Products) feels like a native addition, not a clone.
//
// Auth gate: any unauthenticated user gets bounced to (auth)/sign-in. Logged-in
// users are dropped at the Home tab as usual. We also short-circuit while Nhost
// is bootstrapping the session so we don't flash the wrong UI.

export default function TabLayout() {
  const { isAuthenticated, isLoading } = useAuthenticationStatus();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Palette.orange} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Palette.orange,
        tabBarInactiveTintColor: Palette.textSecondary,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: Palette.bgSubtle,
          borderTopWidth: 0,
          paddingTop: Spacing.sm,
          paddingBottom: Spacing.md,
          height: 84,
          borderTopLeftRadius: Radius.cardLg,
          borderTopRightRadius: Radius.cardLg,
          position: 'absolute',
          shadowColor: '#000',
          shadowOpacity: 0.04,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: -2 },
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}>
      <Tabs.Screen
        name="activities"
        options={{
          title: 'Activities',
          tabBarIcon: ({ color, size }) => (
            <IconSymbol size={size ?? 26} name="sparkles" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="playlist"
        options={{
          title: 'Playlist',
          tabBarIcon: ({ color, size }) => (
            <IconSymbol size={size ?? 26} name="play.rectangle.on.rectangle" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <IconSymbol size={size ?? 28} name="house.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: 'Shop',
          tabBarIcon: ({ color, size }) => (
            <IconSymbol size={size ?? 26} name="bag.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <IconSymbol size={size ?? 26} name="person.fill" color={color} />
          ),
        }}
      />
      {/* Hide the leftover default-template screen so it doesn't render an
          extra tab. Removed file-system entry would also work; leaving the
          screen declared as `href: null` keeps the navigator quiet if it
          gets re-added later. */}
      <Tabs.Screen name="explore" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: Palette.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
