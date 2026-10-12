import VolunteerOpportunity from "../models/volunteerOpportunity.model.js";

/**
 * GET /api/opportunities   (also served via GET /api/volunteers by app.js)
 * Returns all volunteer opportunities for the Home page cards.
 */
export async function getOpportunities(_req, res, next) {
  try {
    const opportunities = await VolunteerOpportunity.findAll({
      order: [
        ["is_priority", "DESC"],
        ["id", "ASC"],
      ],
    });
    res.json(opportunities);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/opportunities/:id   (also GET /api/volunteers/:id)
 * Returns a single opportunity by ID, or 404 if not found.
 */
export async function getOpportunityById(req, res, next) {
  try {
    const opportunity = await VolunteerOpportunity.findByPk(req.params.id);
    if (!opportunity) {
      return res.status(404).json({ message: "Opportunity not found." });
    }
    res.json(opportunity);
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/opportunities/:id   (also DELETE /api/volunteers/:id)
 * Removes an opportunity by ID, or returns 404 if not found.
 */
export async function deleteOpportunity(req, res, next) {
  try {
    const opportunity = await VolunteerOpportunity.findByPk(req.params.id);
    if (!opportunity) {
      return res.status(404).json({ message: "Opportunity not found." });
    }
    await opportunity.destroy();
    res.json({ message: "Opportunity deleted successfully." });
  } catch (error) {
    next(error);
  }
}
