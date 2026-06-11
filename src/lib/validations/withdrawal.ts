import { z } from "zod";

export const withdrawalRequestSchema = z.object({
  amount: z
    .number({ invalid_type_error: "Amount must be a number" })
    .positive("Amount must be greater than zero"),
});

export type WithdrawalRequestInput = z.infer<typeof withdrawalRequestSchema>;
