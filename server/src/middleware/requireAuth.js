import jwt from "jsonwebtoken";
import Account from "../models/account.model.js";

export async function requireAuth(req, res, next) {
  const header = req.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Authentication is required." });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const account = await Account.findByPk(payload.sub, {
      attributes: ["id", "username", "email", "role", "createdAt"],
    });

    if (!account) {
      return res.status(401).json({ message: "Account no longer exists." });
    }

    req.account = account;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
}

export async function optionalAuth(req, res, next) {
  const header = req.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return next();
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const account = await Account.findByPk(payload.sub, {
      attributes: ["id", "username", "email", "role", "createdAt"],
    });

    if (account) {
      req.account = account;
    }
  } catch {
    // ignore invalid token for optional auth
  }

  next();
}

export function requireAdmin(req, res, next) {
  if (req.account?.role !== "admin") {
    return res.status(403).json({ message: "Administrator access is required." });
  }

  next();
}
