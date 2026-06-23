import crypto from "crypto";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "sppuchatbot-super-secret-key-123456";

export interface AuthUser {
  userId: string;
  email: string;
  role: string;
}

/**
 * Generates a random salt and pbkdf2 hash of the password.
 */
export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, 1000, 64, "sha512")
    .toString("hex");
  return { hash, salt };
}

/**
 * Verifies if the check-password pbkdf2 matches the stored hash.
 */
export function verifyPassword(password: string, hash: string, salt: string) {
  const checkHash = crypto
    .pbkdf2Sync(password, salt, 1000, 64, "sha512")
    .toString("hex");
  return hash === checkHash;
}

/**
 * Creates a signed JWT token string (HMAC-SHA256).
 */
export function createToken(payload: AuthUser): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  // Token expires in 7 days
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7;
  const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString("base64url");

  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${header}.${body}`)
    .digest("base64url");

  return `${header}.${body}.${signature}`;
}

/**
 * Verifies a JWT token signature and expiry. Returns payload or null.
 */
export function verifyToken(token: string): AuthUser | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [header, body, signature] = parts;
    const expectedSignature = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(`${header}.${body}`)
      .digest("base64url");

    if (signature !== expectedSignature) return null;

    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      return null; // Expired
    }

    return {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Returns the currently authenticated user based on cookies, or null.
 */
export async function getAuthenticatedUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return null;
    return verifyToken(token);
  } catch (error) {
    return null;
  }
}
