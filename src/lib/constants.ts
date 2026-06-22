// Platform-wide constants shared across admin reporting and payouts.

// Share of gross revenue retained by Apex on each completed purchase.
export const PLATFORM_FEE_RATE = 0.085;

// Share of gross revenue paid out to the lecturer on each completed purchase.
export const LECTURER_SHARE_RATE = 1 - PLATFORM_FEE_RATE;
