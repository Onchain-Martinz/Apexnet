import { z } from "zod";

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
    .min(0, "Price must be 0 or greater"),
});

export type TextbookFormInput = z.infer<typeof textbookFormSchema>;
