import { StyleProp, Text, TextStyle } from 'react-native';
import { formatDistanceToNowStrict } from 'date-fns';

type Props = {
  date: string | Date | null | undefined;
  addSuffix?: boolean;
  style?: StyleProp<TextStyle>;
};

export function RelativeTime({ date, addSuffix = true, style }: Props) {
  if (!date) return null;
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return null;
  return <Text style={style}>{formatDistanceToNowStrict(d, { addSuffix })}</Text>;
}
