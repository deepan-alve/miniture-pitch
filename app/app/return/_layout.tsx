import { Stack } from 'expo-router';

import { Palette } from '@/constants/theme';
import { ReturnFlowProvider } from '@/hooks/use-return-flow';

// One provider wraps the whole return flow group. State (photos, grade,
// path, pickup slot) lives in the provider so each step can read what
// previous steps recorded without round-tripping it through the URL.
//
// All screens here use a single `[id]` dynamic segment. For intro→success
// it carries the *owned-unit* id; for `track` it carries the
// *return-request* id we got back from submission. Disambiguation by
// screen name alone keeps the router schema simple.

export default function ReturnLayout() {
  return (
    <ReturnFlowProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Palette.bg },
          headerTitleStyle: { color: Palette.textPrimary },
          headerTintColor: Palette.orange,
          contentStyle: { backgroundColor: Palette.bg },
        }}>
        <Stack.Screen name="[id]/intro" options={{ title: 'Send back' }} />
        <Stack.Screen name="[id]/photos" options={{ title: 'Photos' }} />
        <Stack.Screen name="[id]/grade" options={{ title: 'Condition' }} />
        <Stack.Screen name="[id]/paths" options={{ title: 'Choose a path' }} />
        <Stack.Screen name="[id]/confirm" options={{ title: 'Schedule pickup' }} />
        <Stack.Screen
          name="[id]/success"
          options={{ title: '', headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen name="[id]/track" options={{ title: 'Tracking' }} />
      </Stack>
    </ReturnFlowProvider>
  );
}
