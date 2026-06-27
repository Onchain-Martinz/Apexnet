import { z } from "zod";

export const studentProfileSchema = z.object({
  name: z.string().trim().max(100, "Name is too long").optional().or(z.literal("")),
  avatarUrl: z.string().trim().url("Enter a valid URL").max(500).optional().or(z.literal("")),
  studentIdNumber: z.string().trim().max(50, "Student ID number is too long").optional().or(z.literal("")),
  level: z
    .union([z.literal(100), z.literal(200), z.literal(300), z.literal(400), z.literal(500)])
    .nullable()
    .optional(),
  universityName: z.string().trim().max(200, "University name is too long").optional().or(z.literal("")),
  departmentName: z.string().trim().max(100, "Department name is too long").optional().or(z.literal("")),
});

export type StudentProfileInput = z.infer<typeof studentProfileSchema>;
