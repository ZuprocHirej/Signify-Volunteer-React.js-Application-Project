import { Router } from "express";
import SiteSetting from "../models/siteSetting.model.js";

const router = Router();

/**
 * GET /api/site-settings
 * Public endpoint to fetch mission statement and impact stats
 */
router.get("/", async (_req, res, next) => {
  try {
    const settings = await SiteSetting.findAll();
    const map = {};
    for (const s of settings) {
      map[s.key] = s.value;
    }

    let stats = [
      { value: "500+", label: "Volunteers Placed" },
      { value: "40+", label: "Partner Organizations" },
      { value: "12,000+", label: "Hours Contributed" },
    ];

    if (map.stats) {
      try {
        stats = JSON.parse(map.stats);
      } catch {
        // use default fallback if JSON parse fails
      }
    }

    res.json({
      missionStatement:
        map.mission_statement ||
        "Signify connects everyday Filipinos with local volunteer opportunities that need them most. No experience required, just a few hours and a willingness to help.",
      stats,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
