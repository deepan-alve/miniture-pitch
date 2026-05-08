import { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Palette, Spacing } from '@/constants/theme';

// Every screen wraps in this so the cream background, safe-area, and
// bottom-tab inset are handled in one place.

type Props = {
  children: ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  topBar?: ReactNode;
};

export function ScreenContainer({ children, scroll = true, style, contentStyle, topBar }: Props) {
  const insets = useSafeAreaInsets();
  const Body = scroll ? ScrollView : View;

  return (
    <SafeAreaView style={[styles.root, style]} edges={['top']}>
      {topBar}
      <Body
        style={styles.body}
        contentContainerStyle={[
          styles.bodyContent,
          { paddingBottom: insets.bottom + 96 /* tab bar */ },
          contentStyle,
        ]}
        showsVerticalScrollIndicator={false}>
        {children}
      </Body>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Palette.bg },
  body: { flex: 1 },
  bodyContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.base },
});
