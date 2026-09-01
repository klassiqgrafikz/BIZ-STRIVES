// Helper to get cookies from the request
function getCookies(req: Request): Record<string, string> {
  const cookieHeader = req.headers.get("cookie") || "";
  const cookies: Record<string, string> = {};
  cookieHeader.split(";").forEach((c) => {
    const [key, ...value] = c.split("=");
    cookies[key.trim()] = value.join("=").trim();
  });
  return cookies;
}

// Hardcoded 0425 login check
export function isHardcodedLogin(req: Request): boolean {
  const cookies = getCookies(req);
  return cookies.logged_in === "true";
}

// Extract the token from cookie header
export function getTokenFromRequest(req: Request): string | null {
  const cookies = getCookies(req);
  return cookies[COOKIE_NAME] || null;
}

// Verify request auth - checks for hardcoded 0425 login OR JWT token
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

export const COOKIE_NAME = "bizstrives_token";