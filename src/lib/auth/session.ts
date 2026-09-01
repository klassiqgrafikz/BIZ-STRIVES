import { cookies } from "next/verify";
import { verifyAccessToken, JwtPayload } from "./jwt";

export const COOKIE_NAME = "bizstrives_token";

// Check for hardcoded 0425 login cookie
export function isHardcodedLogin(req: Request): boolean {
  const cookieHeader = req.headers.get("cookie") || "";
  return cookieHeader.includes("logged_in=true");
}

export async function getSession(): Promise<(JwtPayload & { business?: unknown }) | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const payload = verifyAccessToken(token);
    return payload;
  } catch {
    return null;
  }
}

// Helper for route handlers: extract token from request cookie or Authorization header
export function getTokenFromRequest(req: Request): string | null {
  const cookieHeader = req.headers.get("cookie") || "";
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  if (match) return decodeURIComponent(match[1]);
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

// Verify request auth - checks JWT token OR hardcoded login
export function verifyRequestAuth(req: Request): JwtPayload | null {
  // First check for hardcoded 0425 login
  if (isHardcodedLogin(req)) {
    return { userId: "hardcoded-0425", email: "admin@biz-strives.com", role: "Owner" } as JwtPayload;
  }
  // Then check normal JWT token
  const token = getTokenFromRequest(req);
  if (!token) return null;
  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}