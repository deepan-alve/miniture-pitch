import { Stack } from 'expo-router';

import { Palette } from '@/constants/theme';

export default function MyProductsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Palette.bg },
        headerTitleStyle: { color: Palette.textPrimary },
        headerTintColor: Palette.orange,
        contentStyle: { backgroundColor: Palette.bg },
      }}>
      <Stack.Screen name="index" options={{ title: 'My Products' }} />
      <Stack.Screen name="[id]" options={{ title: '' }} />
    </Stack>
  );
}
