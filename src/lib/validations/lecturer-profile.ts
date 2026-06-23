import { z } from "zod";

export const lecturerProfileSchema = z.object({
  name: z.string().trim().min(1, "Full name is required").max(100, "Full name is too long"),
  title: z.string().trim().min(1, "Academic title is required").max(50, "Title is too long"),
  universityName: z.string().trim().min(1, "University is required").max(200, "University name is too long"),
  departmentName: z.string().trim().min(1, "Department is required").max(100, "Department name is too long"),
  phone: z
    .string()
    .trim()
    .min(7, "Enter a valid phone number")
    .max(20, "Phone number is too long")
    .regex(/^[\d+\-\s()]+$/, "Enter a valid phone number"),
  bio: z.string().trim().max(500, "Bio is too long").optional().or(z.literal("")),
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
