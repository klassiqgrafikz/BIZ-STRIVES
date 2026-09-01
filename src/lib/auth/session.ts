import { cookies } from "next/headers";
import { verifyAccessToken, JwtPayload } from "./jwt";
import prisma from "@/lib/db/prisma";

export const COOKIE_NAME = "bizstrives_token";

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

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true, emailVerifiedAt: true, timezone: true, dateFormat: true, createdAt: true },
  });
  if (!user) return null;
  // fetch businesses for this user
  const memberships = await prisma.businessMember.findMany({
    where: { userId: user.id },
    include: { business: true },
  });
  return { user, memberships, session };
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

export function verifyRequestAuth(req: Request): JwtPayload | null {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}
