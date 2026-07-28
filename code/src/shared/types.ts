import { z } from "zod";

// User schemas
export const UserSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  name: z.string(),
  is_admin: z.boolean(),
  is_payment_confirmed: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const RegisterSchema = z.object({
  name: z.string().min(2, "Ім'я повинно містити принаймні 2 символи"),
  email: z.string().email("Невірний формат email"),
  password: z.string().min(6, "Пароль повинен містити принаймні 6 символів"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Паролі не співпадають",
  path: ["confirmPassword"],
});

export const LoginSchema = z.object({
  email: z.string().email("Невірний формат email"),
  password: z.string().min(1, "Пароль не може бути порожнім"),
});

// Match schemas
export const MatchSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  team1_name: z.string(),
  team2_name: z.string(),
  team1_logo_url: z.string().nullable(),
  team2_logo_url: z.string().nullable(),
  team1_score: z.number(),
  team2_score: z.number(),
  timer_duration: z.number(),
  current_time: z.number(),
  is_timer_running: z.boolean(),
  current_half: z.number(),
  design_theme: z.enum(['classic', 'dark']),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const CreateMatchSchema = z.object({
  team1_name: z.string().min(1, "Назва команди 1 обов'язкова"),
  team2_name: z.string().min(1, "Назва команди 2 обов'язкова"),
  timer_duration: z.number().min(60, "Мінімальна тривалість тайму 1 хвилина"),
  design_theme: z.enum(['classic', 'dark']),
});

// Payment schemas
export const PaymentSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  amount: z.number(),
  status: z.enum(['pending', 'confirmed', 'rejected']),
  payment_method: z.string().nullable(),
  transaction_id: z.string().nullable(),
  confirmed_by_admin_id: z.number().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

// API Response schemas
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: z.any().optional(),
});

export type User = z.infer<typeof UserSchema>;
export type RegisterRequest = z.infer<typeof RegisterSchema>;
export type LoginRequest = z.infer<typeof LoginSchema>;
export type Match = z.infer<typeof MatchSchema>;
export type CreateMatchRequest = z.infer<typeof CreateMatchSchema>;
export type Payment = z.infer<typeof PaymentSchema>;
export type ApiResponse = z.infer<typeof ApiResponseSchema>;
