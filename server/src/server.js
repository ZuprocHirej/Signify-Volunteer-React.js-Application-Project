import "dotenv/config";
import app from "./app.js";
import bcrypt from "bcryptjs";
import sequelize, { ensureDatabase } from "./config/db.js";

// Application models
import VolunteerOpportunity from "./models/volunteerOpportunity.model.js";
import UserApplication from "./models/userApplication.model.js";
import Account from "./models/account.model.js";
import Testimonial from "./models/testimonial.model.js";
import SiteSetting from "./models/siteSetting.model.js";

// ── Associations are initialized via ./models/associations.js in app.js ─────

// ── Seed helpers ──────────────────────────────────────────────────────────────

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "0.0.0.0";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is required in server/.env. Copy server/.env.example and set it before starting the server.");
}


async function seedVolunteerOpportunities() {
  const count = await VolunteerOpportunity.count();
  if (count === 0) {
    await VolunteerOpportunity.bulkCreate([
      {
        name: "Community Tutor",
        type: "Education",
        description:
          "Assist children and teens with after-school reading, mathematics, and general study support.",
        spotsLeft: 12,
        imageUrl: "/opportunities/community-tutor.png",
        isPriority: true,
      },
      {
        name: "Tree Planting & Clean-up",
        type: "Environment",
        description:
          "Join weekend local reforestation and neighborhood waste-reduction campaigns.",
        spotsLeft: 25,
        imageUrl: "/opportunities/tree-planting.jpg",
        isPriority: false,
      },
      {
        name: "Food Drive Logistics",
        type: "Outreach",
        description:
          "Help organize, pack, and distribute care packages and meals to families in need.",
        spotsLeft: 8,
        imageUrl: "/opportunities/food-drive.jpg",
        isPriority: false,
      },
    ]);
    console.log("[seed] Seeded 3 starter volunteer opportunities into the volunteers table.");
  }
}

async function seedInitialTestimonials() {
  const count = await Testimonial.count();
  if (count === 0) {
    await Testimonial.bulkCreate([
      {
        quote:
          "Tutoring in Tondo completely shifted my Saturday mornings. The kids greet you by name by week two, and the fellow volunteers have become some of my closest friends.",
        author: "Maya Santos",
        role: "Community Tutor since 2023",
      },
      {
        quote:
          "I didn't think picking up trash or planting mangroves would feel this grounding. You finish a session sweaty and tired, but looking at a clean strip of coast together is unbeatable.",
        author: "Daniel Cruz",
        role: "Environmental Action Volunteer",
      },
      {
        quote:
          "The logistics team makes you feel immediately useful even on day one. Every box packed means a family has hot meals for a week.",
        author: "Bea Reyes",
        role: "Food Drive Volunteer",
      },
    ]);
    console.log("[seed] Seeded 3 starter testimonials.");
  }
}

async function seedInitialSiteSettings() {
  const count = await SiteSetting.count();
  if (count === 0) {
    await SiteSetting.bulkCreate([
      {
        key: "mission_statement",
        value:
          "Signify connects everyday Filipinos with local volunteer opportunities that need them most. No experience required, just a few hours and a willingness to help.",
      },
      {
        key: "stats",
        value: JSON.stringify([
          { value: "500+", label: "Volunteers Placed" },
          { value: "40+", label: "Partner Organizations" },
          { value: "12,000+", label: "Hours Contributed" },
        ]),
      },
    ]);
    console.log("[seed] Seeded initial site settings (mission & stats).");
  }
}

async function ensureVolunteerOpportunityColumns() {
  const [imgCol] = await sequelize.query("SHOW COLUMNS FROM volunteers LIKE 'image_url'");
  if (imgCol.length === 0) {
    await sequelize.query("ALTER TABLE volunteers ADD COLUMN image_url VARCHAR(500) NULL");
    console.log("[database] Added image_url column to volunteers.");
  }

  const [priorityCol] = await sequelize.query("SHOW COLUMNS FROM volunteers LIKE 'is_priority'");
  if (priorityCol.length === 0) {
    await sequelize.query("ALTER TABLE volunteers ADD COLUMN is_priority TINYINT(1) NOT NULL DEFAULT 0");
    console.log("[database] Added is_priority column to volunteers.");
  }

  const [sessionCol] = await sequelize.query("SHOW COLUMNS FROM volunteers LIKE 'session_details'");
  if (sessionCol.length === 0) {
    await sequelize.query("ALTER TABLE volunteers ADD COLUMN session_details TEXT NULL");
    console.log("[database] Added session_details column to volunteers.");
  }

  const [teamCol] = await sequelize.query("SHOW COLUMNS FROM volunteers LIKE 'team_details'");
  if (teamCol.length === 0) {
    await sequelize.query("ALTER TABLE volunteers ADD COLUMN team_details TEXT NULL");
    console.log("[database] Added team_details column to volunteers.");
  }

  const [prepCol] = await sequelize.query("SHOW COLUMNS FROM volunteers LIKE 'preparation_details'");
  if (prepCol.length === 0) {
    await sequelize.query("ALTER TABLE volunteers ADD COLUMN preparation_details TEXT NULL");
    console.log("[database] Added preparation_details column to volunteers.");
  }

  // Populate starter images if missing or invalid on existing records
  await sequelize.query(`
    UPDATE volunteers
    SET image_url = '/opportunities/community-tutor.png',
        created_at = COALESCE(created_at, '2026-09-27 07:09:49')
    WHERE (image_url IS NULL OR image_url = '' OR image_url LIKE '%ivolunteer%') AND name = 'Community Tutor'
  `);
  await sequelize.query(`
    UPDATE volunteers
    SET image_url = '/opportunities/tree-planting.jpg',
        created_at = COALESCE(created_at, '2026-09-27 07:09:49')
    WHERE (image_url IS NULL OR image_url = '' OR image_url LIKE '%tzuchi%') AND name = 'Tree Planting & Clean-up'
  `);
  await sequelize.query(`
    UPDATE volunteers
    SET image_url = '/opportunities/food-drive.jpg',
        created_at = COALESCE(created_at, '2026-09-27 07:09:49')
    WHERE (image_url IS NULL OR image_url = '' OR image_url LIKE '%bacoor%') AND name = 'Food Drive Logistics'
  `);

  // Populate initial storytelling details for starter records if empty
  await sequelize.query(`
    UPDATE volunteers
    SET session_details = 'Every Saturday starts with a brief 15-minute alignment circle at 8:45 AM. You will be paired with 2-3 elementary or high school learners for tailored reading, math, and homework review. The morning wraps up with group storytelling and a light snack sharing.',
        team_details = 'Led by Teacher Carla and a warm cohort of 10-15 college students and young professionals. Veteran tutors are always seated at your table to offer guidance whenever you need help.',
        preparation_details = 'Please wear comfortable modest clothing suitable for active desk work. Bring a notebook, your favorite pens, and plenty of patience. Modules and textbooks are provided on-site.'
    WHERE name = 'Community Tutor' AND (session_details IS NULL OR session_details = '')
  `);
  await sequelize.query(`
    UPDATE volunteers
    SET session_details = 'Sessions kick off at 7:00 AM with safety briefings and tool assignment. Volunteers divide into planting, soil preparation, and irrigation teams. We plant native saplings until mid-morning, followed by shoreline litter segregation.',
        team_details = 'Partnered with local DENR foresters and community youth leaders. Expect an energetic, physically active crew of 20-30 nature lovers.',
        preparation_details = 'Wear sturdy closed-toe shoes or rubber boots, breathable long-sleeve shirts, and a sun hat. Bring a refillable water tumbler and gardening gloves if you have your own.'
    WHERE name = 'Tree Planting & Clean-up' AND (session_details IS NULL OR session_details = '')
  `);
  await sequelize.query(`
    UPDATE volunteers
    SET session_details = 'Volunteers assemble at the warehouse loading dock at 9:00 AM. We weigh bulk rice sacks, assemble shelf-stable grocery hampers, verify dietary labels, and load delivery vans destined for beneficiary barangays.',
        team_details = 'A focused, organized team of 8-12 volunteers working alongside local parish and barangay disaster relief coordinators.',
        preparation_details = 'Wear closed-toe shoes and clothes you do not mind getting dusty. We supply work gloves, box cutters, and high-visibility vests.'
    WHERE name = 'Food Drive Logistics' AND (session_details IS NULL OR session_details = '')
  `);

  // If no opportunity currently has is_priority set to true, set Community Tutor as the priority
  const [priorities] = await sequelize.query("SELECT id FROM volunteers WHERE is_priority = 1 LIMIT 1");
  if (priorities.length === 0) {
    await sequelize.query("UPDATE volunteers SET is_priority = 1 WHERE name = 'Community Tutor' LIMIT 1");
  }
}

async function ensureAccountIdColumn() {
  const [columns] = await sequelize.query("SHOW COLUMNS FROM applications LIKE 'account_id'");
  if (columns.length > 0) return;

  await sequelize.query(
    "ALTER TABLE applications ADD COLUMN account_id INT NULL, ADD INDEX idx_applications_account_id (account_id), ADD CONSTRAINT fk_applications_account_id FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL ON UPDATE CASCADE"
  );
  console.log("[database] Added account ownership to existing applications.");
}


async function ensureAccountUsernameColumn() {
  const [columns] = await sequelize.query("SHOW COLUMNS FROM accounts LIKE 'username'");
  if (columns.length === 0) {
    await sequelize.query(
      "ALTER TABLE accounts ADD COLUMN username VARCHAR(50) NULL UNIQUE"
    );
    console.log("[database] Added account usernames.");
  }
}

async function ensureApplicationStatusColumn() {
  const [columns] = await sequelize.query("SHOW COLUMNS FROM applications LIKE 'status'");
  if (columns.length === 0) {
    await sequelize.query(
      "ALTER TABLE applications ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'pending'"
    );
    console.log("[database] Added application statuses.");
  }
}

async function ensureAccountRoleColumn() {
  const [columns] = await sequelize.query("SHOW COLUMNS FROM accounts LIKE 'role'");
  if (columns.length === 0) {
    await sequelize.query(
      "ALTER TABLE accounts ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user'"
    );
    console.log("[database] Added account roles.");
  }
}

async function ensureAdminAccount() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const username = process.env.ADMIN_USERNAME?.trim();
  if (!email || !password || !username) return;

  const [account, created] = await Account.findOrCreate({
    where: { email },
    defaults: {
      username,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: "admin",
    },
  });

  if (!created) {
    await account.update({ username, role: "admin" });
  }

  console.log(`[auth] Admin account ready: ${username} (${email}).`);
}

// ── Boot ──────────────────────────────────────────────────────────────────────

try {
  await ensureDatabase();
  await sequelize.authenticate();
  console.log("[database] MariaDB database connection established successfully.");

  // Synchronize missing tables without repeatedly rewriting existing constraints.
  await sequelize.sync();
  console.log("[database] Database tables synchronized.");
  await ensureVolunteerOpportunityColumns();
  await ensureApplicationStatusColumn();
  await ensureAccountUsernameColumn();
  await ensureAccountRoleColumn();
  await ensureAccountIdColumn();
  await ensureAdminAccount();

  // Seed starter data
  await seedVolunteerOpportunities();
  await seedInitialTestimonials();
  await seedInitialSiteSettings();

  app.listen(port, host, () => {
    console.log(`[server] Server listening on http://localhost:${port}`);
    console.log(`[server] LAN access enabled on port ${port} (use this computer's IP address).`);
  });
} catch (error) {
  console.error("[database] Unable to connect to MariaDB database:", error.message);
  console.log("\nTroubleshooting tips:");
  console.log("  1. Make sure MySQL/MariaDB is started in your XAMPP Control Panel.");
  console.log("  2. Open http://localhost/phpmyadmin and verify the database exists.");
  console.log("  3. Check server/.env to ensure DB_USER, DB_PASSWORD, and DB_PORT match your XAMPP settings.\n");

  process.exitCode = 1;
}