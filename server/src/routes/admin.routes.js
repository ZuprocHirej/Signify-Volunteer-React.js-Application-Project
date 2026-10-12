import { Router } from "express";
import {
  createAdminOpportunity,
  createAdminTestimonial,
  deleteAdminApplication,
  deleteAdminOpportunity,
  deleteAdminTestimonial,
  getAdminSiteSettings,
  listAdminApplications,
  listAdminOpportunities,
  listAdminTestimonials,
  updateAdminApplicationStatus,
  updateAdminOpportunity,
  updateAdminSiteSettings,
  updateAdminTestimonial,
} from "../controllers/admin.controller.js";
import { requireAdmin, requireAuth } from "../middleware/requireAuth.js";
import { validate } from "../middleware/validate.js";
import {
  createOpportunitySchema,
  applicationStatusSchema,
  updateOpportunitySchema,
  testimonialSchema,
  updateTestimonialSchema,
  siteSettingsSchema,
} from "../schemas/admin.schema.js";

const router = Router();

router.use(requireAuth, requireAdmin);

// Opportunities
router.get("/opportunities", listAdminOpportunities);
router.post("/opportunities", validate(createOpportunitySchema), createAdminOpportunity);
router.patch("/opportunities/:id", validate(updateOpportunitySchema), updateAdminOpportunity);
router.delete("/opportunities/:id", deleteAdminOpportunity);

// Applications
router.get("/applications", listAdminApplications);
router.patch("/applications/:id/status", validate(applicationStatusSchema), updateAdminApplicationStatus);
router.delete("/applications/:id", deleteAdminApplication);

// Testimonials
router.get("/testimonials", listAdminTestimonials);
router.post("/testimonials", validate(testimonialSchema), createAdminTestimonial);
router.patch("/testimonials/:id", validate(updateTestimonialSchema), updateAdminTestimonial);
router.delete("/testimonials/:id", deleteAdminTestimonial);

// Site Settings (Mission & Impact Stats)
router.get("/site-settings", getAdminSiteSettings);
router.patch("/site-settings", validate(siteSettingsSchema), updateAdminSiteSettings);

export default router;
