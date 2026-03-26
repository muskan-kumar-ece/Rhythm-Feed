/**
 * Authentication helpers — JWT-based with httpOnly cookie transport.
 *
 *  Cookie name : rytham_token
 *  Payload     : { userId, username }
 *  Secret      : JWT_SECRET env var (falls back to a hard-coded dev secret)
 */
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

export const SALT_ROUNDS = 12;

const JWT_SECRET = process.env.JWT_SECRET ?? "rytham-dev-secret-change-in-prod";
const COOKIE_NAME = "rytham_token";
const COOKIE_OPTS = {
  httpOnly:  true,
  sameSite:  "lax" as const,
  secure:    process.env.NODE_ENV === "production",
  maxAge:    7 * 24 * 60 * 60 * 1000,   // 7 days
  path:      "/",
};

// ─── JWT helpers ─────────────────────────────────────────────────────────────

export type JwtPayload = { userId: string; username: string };

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

// ─── Cookie helpers ───────────────────────────────────────────────────────────

export function setAuthCookie(res: Response, payload: JwtPayload): void {
  res.cookie(COOKIE_NAME, signToken(payload), COOKIE_OPTS);
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, { path: "/" });
}

export function getTokenFromRequest(req: Request): JwtPayload | null {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return null;
  return verifyToken(token);
}

// ─── Password helpers ─────────────────────────────────────────────────────────

export const hashPassword   = (plain: string) => bcrypt.hash(plain, SALT_ROUNDS);
export const comparePassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);

// ─── Middleware ───────────────────────────────────────────────────────────────

/** Adds `req.user` if a valid token is present. Non-blocking — use requireAuth for protection. */
export function attachUser(req: Request, _res: Response, next: NextFunction): void {
  const payload = getTokenFromRequest(req);
  if (payload) (req as any).user = payload;
  next();
}

/** Returns 401 if no valid token. Use on routes that need auth. */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const payload = getTokenFromRequest(req);
  if (!payload) {
    res.status(401).json({ message: "Unauthorised" });
    return;
  }
  (req as any).user = payload;
  next();
}
