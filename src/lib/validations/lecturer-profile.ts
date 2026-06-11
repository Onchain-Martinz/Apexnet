import { z } from "zod";

export const lecturerProfileSchema = z.object({
  title: z.string().max(50, "Title is too long").optional().or(z.literal("")),
  universityName: z.string().max(200, "University name is too long").optional().or(z.literal("")),
  departmentName: z.string().max(100, "Department name is too long").optional().or(z.literal("")),
  bankName: z.string().max(100, "Bank name is too long").optional().or(z.literal("")),
  bankAccountNumber: z
    .string()
    .max(20, "Account number is too long")
    .optional()
    .or(z.literal("")),
  bankAccountName: z
    .string()
    .max(100, "Account name is too long")
    .optional()
    .or(z.literal("")),
});

export type LecturerProfileInput = z.infer<typeof lecturerProfileSchema>;
