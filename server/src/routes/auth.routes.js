import { Router } from "express";
import { deleteCurrentAccount, login, me, register } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { validate } from "../middleware/validate.js";
import { loginSchema, registerSchema } from "../schemas/auth.schema.js";

const router = Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.get("/me", requireAuth, me);
router.delete("/me", requireAuth, deleteCurrentAccount);

export default router;
