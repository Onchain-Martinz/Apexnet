// Platform-wide constants shared across admin reporting and payouts.

// Share of gross revenue retained by Apex on each completed purchase.
export const PLATFORM_FEE_RATE = 0.085;

// Share of gross revenue paid out to the lecturer on each completed purchase.
export const LECTURER_SHARE_RATE = 1 - PLATFORM_FEE_RATE;

const DEFAULT_SETTLEMENT_WINDOW_HOURS = 24;

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

// Flutterwave settlements are not immediately available for payout during pilot.
export const SETTLEMENT_WINDOW_HOURS = parsePositiveInteger(
  process.env.SETTLEMENT_WINDOW_HOURS,
  DEFAULT_SETTLEMENT_WINDOW_HOURS,
);

export const PAYOUT_SCHEDULE_LABEL = "Every Saturday";
