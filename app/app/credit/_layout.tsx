import { Stack } from 'expo-router';

import { Palette } from '@/constants/theme';

export default function CreditLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Palette.bg },
        headerTitleStyle: { color: Palette.textPrimary },
        headerTintColor: Palette.orange,
        contentStyle: { backgroundColor: Palette.bg },
      }}>
      <Stack.Screen name="index" options={{ title: 'Store credit' }} />
      <Stack.Screen name="transfer" options={{ title: 'Send credit' }} />
    </Stack>
  );
}
