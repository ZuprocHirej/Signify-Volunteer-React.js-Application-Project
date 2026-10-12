import { z } from "zod";

const credentials = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(150, "Email is too long."),
  password: z.string().min(8, "Password must be at least 8 characters.").max(128, "Password is too long."),
});

export const registerSchema = credentials;
export const loginSchema = credentials;
