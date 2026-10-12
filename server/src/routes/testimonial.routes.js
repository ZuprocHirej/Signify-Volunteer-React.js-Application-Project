import { Router } from "express";
import Testimonial from "../models/testimonial.model.js";

const router = Router();

/**
 * GET /api/testimonials
 * Public endpoint to fetch testimonials for the homepage
 */
router.get("/", async (_req, res, next) => {
  try {
    const testimonials = await Testimonial.findAll({
      order: [["id", "ASC"]],
    });
    res.json(testimonials);
  } catch (error) {
    next(error);
  }
});

export default router;
