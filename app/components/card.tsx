import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

import { Palette, Radius, Shadows, Spacing } from '@/constants/theme';

// Cream-elevated card surface. Use for any rectangular content block where
// the screen background should peek around it.

type Props = {
  children: ReactNode;
  style?: ViewStyle;
  padded?: boolean;
  raised?: boolean;
};

export function Card({ children, style, padded = true, raised = true }: Props) {
  return (
    <View
      style={[
        styles.base,
        padded ? styles.padded : null,
        raised ? Shadows.card : null,
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: Palette.bgElevated,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  padded: { padding: Spacing.lg },
});
