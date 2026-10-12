import cors from "cors";
import express from "express";
import helmet from "helmet";
import { errorHandler } from "./middleware/errorHandler.js";
import opportunityRoutes from "./routes/opportunity.routes.js";
import applicationRoutes from "./routes/application.routes.js";
import authRoutes from "./routes/auth.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import testimonialRoutes from "./routes/testimonial.routes.js";
import siteSettingRoutes from "./routes/siteSetting.routes.js";

import { requestLogger } from "./middleware/logger.js";
import "./models/associations.js";

const app = express();

const allowedOrigins = (process.env.FRONTEND_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins }));
app.use(helmet());
app.use(express.json());
app.use(requestLogger);

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", message: "Volunteer Sign-Up API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/testimonials", testimonialRoutes);
app.use("/api/site-settings", siteSettingRoutes);

// Volunteer Opportunities (volunteers / opportunities endpoints)
app.use("/api/volunteers", opportunityRoutes);
app.use("/api/opportunities", opportunityRoutes);

// Applications (applications table)
app.use("/api/applications", applicationRoutes);

// Global Error Handler
app.use(errorHandler);

export default app;