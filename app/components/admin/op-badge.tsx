import { StyleSheet, Text, View, ViewStyle } from 'react-native';

import { Palette, Radius, Spacing, Typography } from '@/constants/theme';

// Colored pill per Shopify connector operation. Keeps the stub-log scannable
// at a glance — green for "create" things, blue for discount codes, orange
// for sells, gray for everything else.

type Props = {
  operation: string;
  style?: ViewStyle;
};

const OPERATION_COLORS: Record<string, { bg: string; fg: string }> = {
  createRenewedProduct: { bg: Palette.pastelGreen, fg: '#0F5132' },
  markProductSold: { bg: Palette.pastelPeach, fg: '#7A3E13' },
  getProduct: { bg: Palette.bgSubtle, fg: Palette.textSecondary },
  listRenewedProducts: { bg: Palette.bgSubtle, fg: Palette.textSecondary },
  getCustomerOrders: { bg: Palette.pastelLavender, fg: '#3F2F8F' },
  getCustomer: { bg: Palette.pastelLavender, fg: '#3F2F8F' },
  createDiscountCode: { bg: Palette.pastelBlue, fg: '#1B3D9C' },
  getDiscountCode: { bg: Palette.pastelBlue, fg: '#1B3D9C' },
};

export function OpBadge({ operation, style }: Props) {
  const colors = OPERATION_COLORS[operation] ?? {
    bg: Palette.bgSubtle,
    fg: Palette.textSecondary,
  };

  return (
    <View style={[styles.wrap, { backgroundColor: colors.bg }, style]}>
      <Text style={[styles.label, { color: colors.fg }]} numberOfLines={1}>
        {operation}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: 3,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 11,
    fontWeight: Typography.bold as '700',
    fontFamily: 'monospace',
  },
});
