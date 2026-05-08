import { differenceInYears } from 'date-fns';

import type { ChildProfile } from './use-current-account';

// Recommendation logic for which buyback path to highlight.
//
// Rule (from product brief):
//   - Only-child AND that child > 6 years old → recommend `donate`
//     (kid has aged out of catalog; donate keeps the unit out of landfill
//     and gives the parent the warm-fuzzy + 15% off discount).
//   - Otherwise → recommend `trade_in` (it brings the parent back; the
//     bonus multiplier is the carrot).

export type ReturnPath = 'refurb' | 'trade_in' | 'donate';

export function usePathRecommendation(children: ChildProfile[] | undefined): ReturnPath {
  if (!children || children.length === 0) return 'trade_in';

  if (children.length === 1) {
    const ageYears = differenceInYears(new Date(), new Date(children[0]!.birth_date));
    if (ageYears > 6) return 'donate';
  }

  return 'trade_in';
}

// Pricing formulas live next to the recommendation since both are part of
// the path-economics layer.

const GRADE_MULTIPLIER = { good: 0.55, fair: 0.4, worn: 0.25 } as const;

export type SelfDeclaredGrade = keyof typeof GRADE_MULTIPLIER;

export function refurbPayout(originalPriceInr: number, grade: SelfDeclaredGrade): number {
  return Math.round(originalPriceInr * GRADE_MULTIPLIER[grade] * 0.85);
}

export function tradeInPayout(originalPriceInr: number, grade: SelfDeclaredGrade): number {
  return Math.round(originalPriceInr * GRADE_MULTIPLIER[grade] * 1.25);
}
