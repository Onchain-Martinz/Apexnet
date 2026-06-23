import { z } from "zod";

// Whole Naira only — Apexnet does not support fractional/Kobo textbook
// prices. Shared by the upload form (client) and POST /api/books (server)
// so both reject the same way. Deliberately just a non-negative-integer
// check, not a currency parser — ₦99.99/₦100.50/₦100.01 must all fail;
// ₦100/₦500 (and ₦0, for free textbooks) must pass.
export function isValidTextbookPrice(price: number): boolean {
  return Number.isFinite(price) && Number.isInteger(price) && price >= 0;
}

export const textbookFormSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title is too long"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(2000, "Description is too long"),
  department: z
    .string()
    .min(1, "Department is required")
    .max(100, "Department name is too long"),
  level: z.coerce
    .number()
    .int()
    .refine(
      (v) => [100, 200, 300, 400, 500].includes(v),
      "Select a valid level"
    ),
  price: z.coerce
    .number()
    .min(0, "Price must be 0 or greater")
    .int("Price must be a whole Naira amount — Kobo is not supported"),
});

export type TextbookFormInput = z.infer<typeof textbookFormSchema>;
