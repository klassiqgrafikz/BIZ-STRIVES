import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, signAccessToken, verifyAccessToken } from "./jwt";

describe("Auth — Phase 1", () => {
  it("hashes and verifies", async () => {
    const h = await hashPassword("Klassiq123!");
    expect(await verifyPassword("Klassiq123!", h)).toBe(true);
    expect(await verifyPassword("wrong", h)).toBe(false);
  });
  it("signs and verifies JWT with business scope", () => {
    const token = signAccessToken({ userId: "u1", email: "a@b.com", businessId: "b1", role: "Owner" });
    const p = verifyAccessToken(token);
    expect(p.userId).toBe("u1");
    expect(p.businessId).toBe("b1");
    expect(p.role).toBe("Owner");
  });
  it("rejects tampered token", () => {
    const t = signAccessToken({ userId: "u1", email: "a@b.com" });
    expect(() => verifyAccessToken(t + "x")).toThrow();
  });
});
