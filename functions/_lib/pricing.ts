// Pricing math for the buyback flow.
//
// All inputs and outputs are integer rupees (matches the schema: price_inr,
// credit_amount_inr, etc.). We never deal in paise — the schema is rupees.
//
// The numbers below are the demo's economic story. They are tunable and
// should land in a `pricing_rules` table for production, but for the pitch
// they live here so the math is auditable in one place.

export type ConditionGrade = 'good' | 'fair' | 'worn' | 'unfit';

/**
 * What fraction of the original retail price we list a refurbished unit at.
 * `unfit` units don't get listed — they're routed to recycling instead, so
 * we don't compute a refurb price for them.
 */
export const REFURB_PRICE_MULTIPLIER: Record<ConditionGrade, number> = {
  good: 0.55,
  fair: 0.40,
  worn: 0.25,
  unfit: 0,
};

/**
 * Parent's share of the listed refurb price as store credit.
 * Miniture keeps (1 - PARENT_SHARE) as margin to cover QC + cleaning + ops.
 */
export const PARENT_SHARE_OF_REFURB = 0.85;

/**
 * Trade-in bonus multiplier applied to the refurb credit.
 * Trade-in credit is locked to next purchase (12 mo expiry), so we sweeten
 * it with 25% over plain refurb to drive return-customer behaviour.
 */
export const TRADE_IN_BONUS = 1.25;

export const TRADE_IN_EXPIRY_MONTHS = 12;

/** ₹500 fixed thank-you discount value range note: codes are PERCENTAGE, not fixed. */
export const DONATE_THANK_YOU_DISCOUNT_PCT = 15;
export const DONATE_THANK_YOU_EXPIRY_DAYS = 90;

export interface PathPricing {
  refurbListedPriceInr: number;
  /** What goes into the parent's `store_credit_ledger` row. */
  creditAmountInr: number;
  /** Set on the ledger row only for trade_in (refurb credit doesn't expire). */
  expiresAtIso: string | null;
}

/**
 * Compute the refurb-listing price + credit for a given path & condition.
 *
 * `refurb` and `trade_in` share the same physical pipeline, so they share the
 * same listed price; the difference is in the credit (trade_in bumps by 1.25
 * and gets a 12-month expiry).
 */
export function priceForPath(
  path: 'refurb' | 'trade_in',
  originalPriceInr: number,
  grade: ConditionGrade,
): PathPricing {
  const mult = REFURB_PRICE_MULTIPLIER[grade] ?? 0;
  const refurbListedPriceInr = Math.round(originalPriceInr * mult);
  const baseCredit = Math.round(refurbListedPriceInr * PARENT_SHARE_OF_REFURB);

  if (path === 'trade_in') {
    const credit = Math.round(baseCredit * TRADE_IN_BONUS);
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + TRADE_IN_EXPIRY_MONTHS);
    return {
      refurbListedPriceInr,
      creditAmountInr: credit,
      expiresAtIso: expiry.toISOString(),
    };
  }

  return {
    refurbListedPriceInr,
    creditAmountInr: baseCredit,
    expiresAtIso: null,
  };
}

/** Generate the discount-code expiry timestamp for the donate thank-you. */
export function donateDiscountExpiryIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + DONATE_THANK_YOU_EXPIRY_DAYS);
  return d.toISOString();
}
