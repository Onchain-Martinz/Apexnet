import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters"),
});

// Shared strength rules for any newly-set password (registration, reset, etc).
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

export const registerSchema = z
  .object({
    name: z
      .string()
      .min(1, "Name is required")
      .min(2, "Name must be at least 2 characters")
      .max(80, "Name is too long"),
    email: z
      .string()
      .min(1, "Email is required")
      .email("Enter a valid email address"),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
    role: z.enum(["STUDENT", "LECTURER"], {
      required_error: "Please select a role",
    }),
    // Required for STUDENT role only — the dashboard's course matching
    // depends entirely on departmentId + level. Lecturers set these via
    // their own profile edit page after signup instead.
    universityName: z.string().trim().max(200, "University name is too long").optional(),
    departmentName: z.string().trim().max(100, "Department name is too long").optional(),
    level: z.coerce.number().int().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.role !== "STUDENT" || !!data.universityName?.trim(), {
    message: "University is required",
    path: ["universityName"],
  })
  .refine((data) => data.role !== "STUDENT" || !!data.departmentName?.trim(), {
    message: "Department is required",
    path: ["departmentName"],
  })
  .refine((data) => data.role !== "STUDENT" || [100, 200, 300, 400, 500].includes(data.level ?? -1), {
    message: "Select a valid level",
    path: ["level"],
  });

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
});

export const resetPasswordSchema = z
  .object({
    email: z
      .string()
      .min(1, "Email is required")
      .email("Enter a valid email address"),
    code: z
      .string()
      .min(1, "Enter the 6-digit code")
      .regex(/^\d{6}$/, "Enter the 6-digit code"),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// Authenticated, in-session password change — no OTP. Identity is already
// proven by the active session; this is not a substitute for the
// unauthenticated forgot/reset-password OTP flow above.
export const changePasswordSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
