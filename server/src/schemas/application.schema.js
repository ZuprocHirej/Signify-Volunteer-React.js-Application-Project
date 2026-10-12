import { z } from "zod";

const namePattern = /^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ\s'-]*$/;
const phonePattern = /^\d{11}$/;
const validDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const validBlocks = ["Morning", "Afternoon", "Evening"];
const validSkills = [
  "Communication",
  "Leadership",
  "First Aid",
  "Teaching",
  "Manual Labor",
  "Event Planning",
  "Cooking",
  "Driving",
];
const validSources = [
  "",
  "School / University",
  "Social Media",
  "Friend / Family",
  "Community Event",
  "Other",
];

const requiredName = (label) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .max(50, `${label} must be 50 characters or fewer.`)
    .regex(namePattern, `${label} may contain letters, spaces, apostrophes, and hyphens only.`);

const optionalText = (label, max) =>
  z.string().trim().max(max, `${label} must be ${max} characters or fewer.`);

export const applicationSchema = z.object({
  volunteerId: z.coerce.number().int().positive("Select a valid volunteer opportunity."),
  firstName: requiredName("First name"),
  lastName: requiredName("Last name"),
  email: z.string().trim().email("Enter a valid email address.").max(150, "Email is too long."),
  phone: z.string().trim().min(1, "Phone number is required.").regex(phonePattern, "Phone number must contain exactly 11 digits."),
  age: z.string().trim().refine(
    (value) => value === "" || (/^\d+$/.test(value) && Number(value) >= 0 && Number(value) <= 120),
    "Age must be a whole number between 0 and 120."
  ),
  city: optionalText("City", 100).refine(
    (value) => value === "" || namePattern.test(value),
    "City may contain letters, spaces, apostrophes, and hyphens only."
  ),
  availability: z.array(z.string().regex(
    new RegExp(`^(${validDays.join("|")})-(${validBlocks.join("|")})$`),
    "Choose a valid availability slot."
  )).min(1, "Please select at least one available time slot."),
  experience: optionalText("Experience", 300),
  skills: z.array(z.enum(validSkills)),
  heardAbout: z.enum(validSources),
  agreeTerms: z.literal(true, {
    errorMap: () => ({ message: "You must agree to the volunteer terms and code of conduct." }),
  }),
});
