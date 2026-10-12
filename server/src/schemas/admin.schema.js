import { z } from "zod";

const opportunityFields = {
  name: z.string().trim().min(1, "Name is required.").max(150, "Name is too long."),
  type: z.string().trim().min(1, "Type is required.").max(50, "Type is too long."),
  description: z.string().trim().max(2000, "Description is too long."),
  spotsLeft: z.coerce.number().int().min(0, "Spots cannot be negative."),
  imageUrl: z
    .union([
      z.string().trim().url("Image URL must be a valid URL.").max(500, "Image URL is too long."),
      z.literal(""),
      z.null(),
    ])
    .optional()
    .transform((val) => val || null),
  isPriority: z.coerce.boolean().optional().default(false),
  sessionDetails: z.string().trim().max(3000, "Session details too long.").optional().nullable(),
  teamDetails: z.string().trim().max(3000, "Team details too long.").optional().nullable(),
  preparationDetails: z.string().trim().max(3000, "Preparation details too long.").optional().nullable(),
};

export const createOpportunitySchema = z.object(opportunityFields);
export const updateOpportunitySchema = z
  .object(opportunityFields)
  .partial()
  .refine((value) => Object.keys(value).length > 0, "Provide at least one field to update.");

export const applicationStatusSchema = z.object({
  status: z.enum(["pending", "approved", "rejected"]),
});

export const testimonialSchema = z.object({
  quote: z.string().trim().min(1, "Quote is required.").max(1000, "Quote is too long."),
  author: z.string().trim().min(1, "Author name is required.").max(100, "Author name is too long."),
  role: z.string().trim().min(1, "Role is required.").max(150, "Role is too long."),
});

export const updateTestimonialSchema = testimonialSchema
  .partial()
  .refine((val) => Object.keys(val).length > 0, "Provide at least one field to update.");

export const siteSettingsSchema = z.object({
  missionStatement: z.string().trim().min(1, "Mission statement is required.").max(2000, "Mission statement is too long."),
  stats: z
    .array(
      z.object({
        value: z.string().trim().min(1, "Stat value is required.").max(50),
        label: z.string().trim().min(1, "Stat label is required.").max(100),
      })
    )
    .min(1, "At least one stat is required.")
    .max(6, "Maximum 6 stats allowed."),
});
