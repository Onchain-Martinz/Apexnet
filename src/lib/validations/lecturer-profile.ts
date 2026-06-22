import { z } from "zod";

export const lecturerProfileSchema = z.object({
  title: z.string().max(50, "Title is too long").optional().or(z.literal("")),
  universityName: z.string().max(200, "University name is too long").optional().or(z.literal("")),
  departmentName: z.string().max(100, "Department name is too long").optional().or(z.literal("")),
});

export type LecturerProfileInput = z.infer<typeof lecturerProfileSchema>;

// ── Bank verification ───────────────────────────────────────────────────────

export const verifyBankSchema = z.object({
  bankCode: z.string().min(1, "Select a bank"),
  accountNumber: z
    .string()
    .regex(/^\d{10}$/, "Account number must be 10 digits"),
});

export type VerifyBankInput = z.infer<typeof verifyBankSchema>;
