import sequelize from "../config/db.js";
import Account from "../models/account.model.js";
import UserApplication from "../models/userApplication.model.js";
import VolunteerOpportunity from "../models/volunteerOpportunity.model.js";
import Testimonial from "../models/testimonial.model.js";
import SiteSetting from "../models/siteSetting.model.js";

function toApplicationResponse(application) {
  return {
    id: application.id,
    firstName: application.firstName,
    lastName: application.lastName,
    email: application.email,
    phone: application.phone,
    age: application.age,
    city: application.city,
    availability: application.availability,
    experience: application.experience,
    skills: application.skills,
    heardAbout: application.heardAbout,
    agreeTerms: application.agreeTerms,
    status: application.status,
    submittedAt: application.submittedAt,
    volunteerId: application.volunteerId,
    volunteerName: application.opportunity?.name ?? "",
    volunteerType: application.opportunity?.type ?? "",
    accountEmail: application.account?.email ?? null,
  };
}

export async function updateAdminApplicationStatus(req, res, next) {
  try {
    const application = await UserApplication.findByPk(req.params.id);
    if (!application) return res.status(404).json({ message: "Application not found." });

    await application.update({ status: req.validatedBody.status });
    res.json({ id: application.id, status: application.status });
  } catch (error) {
    next(error);
  }
}

export async function listAdminOpportunities(_req, res, next) {
  try {
    res.json(await VolunteerOpportunity.findAll({
      order: [
        ["is_priority", "DESC"],
        ["id", "ASC"],
      ],
    }));
  } catch (error) {
    next(error);
  }
}

export async function createAdminOpportunity(req, res, next) {
  try {
    if (req.validatedBody.isPriority) {
      await VolunteerOpportunity.update({ isPriority: false }, { where: { isPriority: true } });
    }
    const opportunity = await VolunteerOpportunity.create(req.validatedBody);
    res.status(201).json(opportunity);
  } catch (error) {
    next(error);
  }
}

export async function updateAdminOpportunity(req, res, next) {
  try {
    const opportunity = await VolunteerOpportunity.findByPk(req.params.id);
    if (!opportunity) return res.status(404).json({ message: "Opportunity not found." });

    if (req.validatedBody.isPriority) {
      await VolunteerOpportunity.update({ isPriority: false }, { where: { isPriority: true } });
    }

    await opportunity.update(req.validatedBody);
    res.json(opportunity);
  } catch (error) {
    next(error);
  }
}

export async function deleteAdminOpportunity(req, res, next) {
  try {
    const opportunity = await VolunteerOpportunity.findByPk(req.params.id);
    if (!opportunity) return res.status(404).json({ message: "Opportunity not found." });

    const applicationCount = await UserApplication.count({ where: { volunteerId: opportunity.id } });
    if (applicationCount > 0) {
      return res.status(409).json({
        message: "This opportunity has applications and cannot be deleted. Edit it instead.",
      });
    }

    await opportunity.destroy();
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}

export async function listAdminApplications(_req, res, next) {
  try {
    const applications = await UserApplication.findAll({
      include: [
        { model: VolunteerOpportunity, as: "opportunity", attributes: ["id", "name", "type"] },
        { model: Account, as: "account", attributes: ["email"] },
      ],
      order: [["submitted_at", "DESC"]],
    });
    res.json(applications.map(toApplicationResponse));
  } catch (error) {
    next(error);
  }
}

export async function deleteAdminApplication(req, res, next) {
  const transaction = await sequelize.transaction();
  try {
    const application = await UserApplication.findByPk(req.params.id, {
      include: [{ model: VolunteerOpportunity, as: "opportunity" }],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!application) {
      await transaction.rollback();
      return res.status(404).json({ message: "Application not found." });
    }

    await application.destroy({ transaction });
    if (application.opportunity) {
      await application.opportunity.increment("spotsLeft", { by: 1, transaction });
    }

    await transaction.commit();
    res.status(204).end();
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
}

// ── Testimonials CRUD ─────────────────────────────────────────────────────────

export async function listAdminTestimonials(_req, res, next) {
  try {
    const testimonials = await Testimonial.findAll({
      order: [["id", "ASC"]],
    });
    res.json(testimonials);
  } catch (error) {
    next(error);
  }
}

export async function createAdminTestimonial(req, res, next) {
  try {
    const testimonial = await Testimonial.create(req.validatedBody);
    res.status(201).json(testimonial);
  } catch (error) {
    next(error);
  }
}

export async function updateAdminTestimonial(req, res, next) {
  try {
    const testimonial = await Testimonial.findByPk(req.params.id);
    if (!testimonial) {
      return res.status(404).json({ message: "Testimonial not found." });
    }

    await testimonial.update(req.validatedBody);
    res.json(testimonial);
  } catch (error) {
    next(error);
  }
}

export async function deleteAdminTestimonial(req, res, next) {
  try {
    const testimonial = await Testimonial.findByPk(req.params.id);
    if (!testimonial) {
      return res.status(404).json({ message: "Testimonial not found." });
    }

    await testimonial.destroy();
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}

// ── Site Settings (Mission & Impact Stats) ────────────────────────────────────

export async function getAdminSiteSettings(_req, res, next) {
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
        // fallback to default
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
}

export async function updateAdminSiteSettings(req, res, next) {
  try {
    const { missionStatement, stats } = req.validatedBody;

    await SiteSetting.upsert({
      key: "mission_statement",
      value: missionStatement,
    });

    await SiteSetting.upsert({
      key: "stats",
      value: JSON.stringify(stats),
    });

    res.json({
      missionStatement,
      stats,
    });
  } catch (error) {
    next(error);
  }
}
