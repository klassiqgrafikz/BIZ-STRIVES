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

// Cookie name for session
export const COOKIE_NAME = "bizstrives_token";

// Verify request auth - checks for authenticated session via cookie
export function verifyRequestAuth(req: Request): { userId: string; email: string; role: string } | null {
  const cookies = getCookies(req);
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  
  // In hardcoded mode, always return admin user if cookie exists
  return {
    userId: "admin-0425",
    email: "admin@biz-strives.com",
    role: "Owner"
  };
}

// Get user from request cookie
export function getUserFromRequest(req: Request): { userId: string; email: string; role: string } | null {
  const cookies = getCookies(req);
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  
  // In hardcoded mode, always return admin user if cookie exists
  return {
    userId: "admin-0425",
    email: "admin@biz-strives.com",
    role: "Owner"
  };
}