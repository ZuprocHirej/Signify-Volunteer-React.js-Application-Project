import { z } from "zod";
import {
  DAYS,
  HEARD_ABOUT_OPTIONS,
  SKILL_OPTIONS,
  TIME_BLOCKS,
} from "../types/ApplicationFormData";

const namePattern = /^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ\s'-]*$/;
const phonePattern = /^\d{11}$/;
const availabilityPattern = new RegExp(
  `^(${DAYS.join("|")})-(${TIME_BLOCKS.map((block) => block.key).join("|")})$`
);

const requiredName = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .max(50, `${label} must be 50 characters or fewer.`)
    .regex(namePattern, `${label} may contain letters, spaces, apostrophes, and hyphens only.`);

const optionalText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer.`);

export const applicationSchema = z.object({
  firstName: requiredName("First name"),
  lastName: requiredName("Last name"),
  email: z.string().trim().email("Enter a valid email address.").max(150, "Email is too long."),
  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required.")
    .regex(phonePattern, "Phone number must contain exactly 11 digits."),
  age: z.string().trim().refine(
    (value) => value === "" || (/^\d+$/.test(value) && Number(value) >= 0 && Number(value) <= 120),
    "Age must be a whole number between 0 and 120."
  ),
  city: optionalText("City", 100).refine(
    (value) => value === "" || namePattern.test(value),
    "City may contain letters, spaces, apostrophes, and hyphens only."
  ),
  availability: z
    .array(z.string().regex(availabilityPattern, "Choose a valid availability slot."))
    .min(1, "Please select at least one available time slot."),
  experience: optionalText("Experience", 300),
  skills: z.array(z.enum(SKILL_OPTIONS as [string, ...string[]])),
  heardAbout: z.enum(["", ...HEARD_ABOUT_OPTIONS] as [string, ...string[]]),
  agreeTerms: z.literal(true, {
    message: "You must agree to the volunteer terms and code of conduct.",
  }),
});

export type ValidatedApplication = z.infer<typeof applicationSchema>;
