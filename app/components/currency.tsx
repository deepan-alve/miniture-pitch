import { StyleProp, Text, TextStyle } from 'react-native';

// ₹ formatter using Intl. Defaults to integer rupees (matches the schema's
// `price_inr` integer columns).

type Props = {
  amount: number | string | null | undefined;
  style?: StyleProp<TextStyle>;
  strikethrough?: boolean;
  fractionDigits?: number;
};

const formatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const formatterFractional = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function Currency({ amount, style, strikethrough, fractionDigits = 0 }: Props) {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  const safe = typeof num === 'number' && !Number.isNaN(num) ? num : 0;
  const text = (fractionDigits === 0 ? formatter : formatterFractional).format(safe);
  return (
    <Text
      style={[
        strikethrough ? { textDecorationLine: 'line-through' as const } : null,
        style,
      ]}>
      {text}
    </Text>
  );
}

export function formatRupees(amount: number | string | null | undefined): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  const safe = typeof num === 'number' && !Number.isNaN(num) ? num : 0;
  return formatter.format(safe);
}
