import { Router } from "express";
import {
  getOpportunities,
  getOpportunityById,
  deleteOpportunity,
} from "../controllers/opportunity.controller.js";

const router = Router();

router.get("/", getOpportunities);
router.get("/:id", getOpportunityById);
router.delete("/:id", deleteOpportunity);

export default router;
