// Shared `select` shape for WithdrawalRequest responses returned by the
// admin review/retry endpoints.
export const WITHDRAWAL_SELECT_FIELDS = {
  id: true,
  amount: true,
  status: true,
  createdAt: true,
  reviewedAt: true,
  transferReference: true,
  transferCode: true,
  failureReason: true,
  retryCount: true,
} as const;
