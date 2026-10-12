import sequelize from "../config/db.js";
import { Op } from "sequelize";
import UserApplication from "../models/userApplication.model.js";
import VolunteerOpportunity from "../models/volunteerOpportunity.model.js";

/**
 * GET /api/applications
 * Returns every submitted application joined with its opportunity.
 * Powers the "My Applications" page.
 */
export async function getApplications(req, res, next) {
  try {
    const whereClause = req.account ? { accountId: req.account.id } : {};
    const applications = await UserApplication.findAll({
      include: [
        {
          model: VolunteerOpportunity,
          as: "opportunity",
          attributes: ["id", "name", "type"],
        },
      ],
      where: whereClause,
      order: [["submitted_at", "DESC"]],
    });

    const result = applications.map((app) => ({
      id: app.id,
      firstName: app.firstName,
      lastName: app.lastName,
      email: app.email,
      phone: app.phone,
      age: app.age,
      city: app.city,
      availability: app.availability, // parsed by getter
      experience: app.experience,
      skills: app.skills,             // parsed by getter
      heardAbout: app.heardAbout,
      agreeTerms: app.agreeTerms,
      submittedAt: app.submittedAt,
      volunteerId: app.volunteerId,
      volunteerName: app.opportunity?.name ?? "",
      volunteerType: app.opportunity?.type ?? "",
      status: app.status,
    }));

    res.json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/applications/:id
 * Fetches a single application record by ID, or returns 404 if not found.
 */
export async function getApplicationById(req, res, next) {
  try {
    const app = await UserApplication.findByPk(req.params.id, {
      include: [
        {
          model: VolunteerOpportunity,
          as: "opportunity",
          attributes: ["id", "name", "type"],
        },
      ],
    });

    if (!app) {
      return res.status(404).json({ message: "Application not found." });
    }

    res.json({
      id: app.id,
      firstName: app.firstName,
      lastName: app.lastName,
      email: app.email,
      phone: app.phone,
      age: app.age,
      city: app.city,
      availability: app.availability,
      experience: app.experience,
      skills: app.skills,
      heardAbout: app.heardAbout,
      agreeTerms: app.agreeTerms,
      submittedAt: app.submittedAt,
      volunteerId: app.volunteerId,
      volunteerName: app.opportunity?.name ?? "",
      volunteerType: app.opportunity?.type ?? "",
      status: app.status,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/applications
 * Creates a new application and decrements the opportunity's spots left.
 */
export async function submitApplication(req, res, next) {
  const {
    volunteerId,
    firstName,
    lastName,
    email,
    phone,
    age,
    city,
    availability = [],
    experience,
    skills = [],
    heardAbout,
    agreeTerms,
  } = req.validatedBody;

  const accountId = req.account?.id || null;
  const t = await sequelize.transaction();

  try {
    if (accountId) {
      const existingApplication = await UserApplication.findOne({
        where: { accountId, volunteerId },
        transaction: t,
      });
      if (existingApplication) {
        await t.rollback();
        return res
          .status(409)
          .json({ message: "You've already applied to this opportunity." });
      }
    }

    const [updatedOpportunityCount] = await VolunteerOpportunity.update(
      { spotsLeft: sequelize.literal("spots_left - 1") },
      {
        where: {
          id: volunteerId,
          spotsLeft: { [Op.gt]: 0 },
        },
        transaction: t,
      }
    );

    if (updatedOpportunityCount === 0) {
      const opportunity = await VolunteerOpportunity.findByPk(volunteerId, {
        transaction: t,
      });
      await t.rollback();
      return res.status(opportunity ? 400 : 404).json({
        message: opportunity
          ? "Sorry, this opportunity is already full."
          : "Selected opportunity does not exist.",
      });
    }

    const newApp = await UserApplication.create(
      {
        accountId,
        volunteerId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        age: age ? Number(age) : null,
        city: city || null,
        availability,
        experience: experience || null,
        skills,
        heardAbout: heardAbout || null,
        agreeTerms: !!agreeTerms,
      },
      { transaction: t }
    );

    await t.commit();
    res
      .status(201)
      .json({ id: newApp.id, message: "Application submitted successfully." });
  } catch (error) {
    await t.rollback();
    if (
      error.name === "SequelizeUniqueConstraintError" ||
      error.original?.code === "ER_DUP_ENTRY"
    ) {
      return res
        .status(409)
        .json({ message: "You've already applied to this opportunity." });
    }
    next(error);
  }
}

/**
 * DELETE /api/applications/:id
 * Deletes an application record and restores the opportunity's available spot count.
 */
export async function deleteApplication(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const app = await UserApplication.findByPk(req.params.id, {
      transaction: t,
    });
    if (!app) {
      await t.rollback();
      return res.status(404).json({ message: "Application not found." });
    }

    // Restore spot count if application is linked to an opportunity
    if (app.volunteerId) {
      await VolunteerOpportunity.update(
        { spotsLeft: sequelize.literal("spots_left + 1") },
        { where: { id: app.volunteerId }, transaction: t }
      );
    }

    await app.destroy({ transaction: t });
    await t.commit();

    res.json({ message: "Application deleted successfully." });
  } catch (error) {
    await t.rollback();
    next(error);
  }
}
