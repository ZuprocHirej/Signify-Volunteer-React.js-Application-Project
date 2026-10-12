import { Router } from "express";
import {
  getApplications,
  getApplicationById,
  submitApplication,
  deleteApplication,
} from "../controllers/application.controller.js";
import { validate } from "../middleware/validate.js";
import { applicationSchema } from "../schemas/application.schema.js";
import { optionalAuth, requireAuth } from "../middleware/requireAuth.js";

const router = Router();

// List all applications for logged-in user
router.get("/", requireAuth, getApplications);

// Get one application by ID (returns 200 on success, 404 if not found)
router.get("/:id", getApplicationById);

// Submit a new application (returns 201 on success, 400 on invalid input)
router.post("/", validate(applicationSchema), optionalAuth, submitApplication);

// Delete / withdraw an application record (returns 200 on success, 404 if not found)
router.delete("/:id", deleteApplication);

export default router;
