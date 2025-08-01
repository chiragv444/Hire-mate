import { z } from "zod";

// Auth validation schemas
export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

// Onboarding validation schemas
export const onboardingStep1Schema = z.object({
  currentStatus: z.string().min(1, "Please select your current status"),
});

export const onboardingStep2Schema = z.object({
  industry: z.string().min(1, "Please select an industry"),
});

export const onboardingStep3Schema = z.object({
  careerPath: z.string().min(1, "Please select a career path"),
});

export const onboardingStep4Schema = z.object({
  experienceLevel: z.string().min(1, "Please select your experience level"),
});

export const onboardingStep5Schema = z.object({
  resumeFile: z.any().refine((file) => file instanceof File, "Please upload a resume"),
});

export const onboardingStep6Schema = z.object({
  userGoals: z.array(z.string()).min(1, "Please select at least one goal"),
});

export const onboardingStep7Schema = z.object({
  userNote: z.string().optional(),
});

// Job input validation
export const jobInputSchema = z.object({
  jobDescription: z.string().min(50, "Job description must be at least 50 characters"),
  linkedinUrl: z.string().url("Please enter a valid LinkedIn URL").optional().or(z.literal("")),
});

// Profile validation
export const profileSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
});

// Cover letter validation
export const coverLetterSchema = z.object({
  content: z.string().min(100, "Cover letter must be at least 100 characters"),
});

// File upload validation
export const resumeFileSchema = z.object({
  file: z.any()
    .refine((file) => file instanceof File, "Please select a file")
    .refine((file) => file && file.size <= 10 * 1024 * 1024, "File size must be less than 10MB")
    .refine(
      (file) => file && ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type),
      "Only PDF and DOCX files are allowed"
    ),
});

// Type exports
export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type JobInputFormData = z.infer<typeof jobInputSchema>;
export type ProfileFormData = z.infer<typeof profileSchema>;
export type CoverLetterFormData = z.infer<typeof coverLetterSchema>;