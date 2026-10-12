import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import sequelize from "../config/db.js";
import Account from "../models/account.model.js";
import UserApplication from "../models/userApplication.model.js";
import VolunteerOpportunity from "../models/volunteerOpportunity.model.js";

function toAccountResponse(account) {
  return {
    id: account.id,
    username: account.username,
    email: account.email,
    role: account.role,
    createdAt: account.createdAt,
  };
}

function createToken(account) {
  return jwt.sign(
    { email: account.email },
    process.env.JWT_SECRET,
    { subject: String(account.id), expiresIn: "7d" }
  );
}

function sendAuthResponse(res, account, statusCode = 200) {
  return res.status(statusCode).json({
    token: createToken(account),
    account: toAccountResponse(account),
  });
}

export async function register(req, res, next) {
  try {
    const { email, password } = req.validatedBody;
    const normalizedEmail = email.toLowerCase();
    const existingAccount = await Account.findOne({ where: { email: normalizedEmail } });

    if (existingAccount) {
      return res.status(409).json({ message: "An account with that email already exists." });
    }

    const account = await Account.create({
      email: normalizedEmail,
      passwordHash: await bcrypt.hash(password, 12),
    });

    return sendAuthResponse(res, account, 201);
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.validatedBody;
    const account = await Account.findOne({ where: { email: email.toLowerCase() } });
    const passwordMatches = account && await bcrypt.compare(password, account.passwordHash);

    if (!account || !passwordMatches) {
      return res.status(401).json({ message: "Email or password is incorrect." });
    }

    return sendAuthResponse(res, account);
  } catch (error) {
    next(error);
  }
}

export function me(req, res) {
  res.json({ account: toAccountResponse(req.account) });
}

export async function deleteCurrentAccount(req, res, next) {
  const transaction = await sequelize.transaction();
  try {
    const applications = await UserApplication.findAll({
      where: { accountId: req.account.id },
      include: [{ model: VolunteerOpportunity, as: "opportunity" }],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    for (const application of applications) {
      await application.destroy({ transaction });
      if (application.opportunity) {
        await application.opportunity.increment("spotsLeft", { by: 1, transaction });
      }
    }

    await Account.destroy({ where: { id: req.account.id }, transaction });
    await transaction.commit();
    res.status(204).end();
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
}
