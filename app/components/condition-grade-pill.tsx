import { Palette } from '@/constants/theme';
import { Pill } from './pill';

// Color-coded grade pill. Grade name is canonical lowercase; we render a
// title-cased label.

export type ConditionGrade = 'good' | 'fair' | 'worn';

const PALETTE: Record<ConditionGrade, { bg: string; dot: string; text: string; label: string }> = {
  good: {
    bg: Palette.pastelGreen,
    dot: Palette.success,
    text: Palette.textPrimary,
    label: 'Good',
  },
  fair: {
    bg: Palette.pastelYellow,
    dot: Palette.yellowDeep,
    text: Palette.textPrimary,
    label: 'Fair',
  },
  worn: {
    bg: Palette.pastelPeach,
    dot: Palette.orange,
    text: Palette.textPrimary,
    label: 'Worn',
  },
};

export function ConditionGradePill({ grade }: { grade: ConditionGrade }) {
  const cfg = PALETTE[grade];
  return (
    <Pill
      label={cfg.label}
      dotColor={cfg.dot}
      background={cfg.bg}
      textColor={cfg.text}
    />
  );
}
