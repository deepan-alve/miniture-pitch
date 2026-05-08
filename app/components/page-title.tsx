import { StyleSheet, Text, View } from 'react-native';

import { Palette, Spacing, Typography } from '@/constants/theme';

type Props = {
  title: string;
  subtitle?: string;
};

export function PageTitle({ title, subtitle }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: Spacing.lg },
  title: {
    fontSize: Typography.heading,
    fontWeight: Typography.bold as '700',
    color: Palette.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: Typography.body,
    color: Palette.textSecondary,
    marginTop: Spacing.xs,
  },
});
