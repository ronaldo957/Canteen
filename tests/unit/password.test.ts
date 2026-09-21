import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";

describe("password hashing", () => {
  it("hashes a password and verifies the correct password", async () => {
    const hash = await hashPassword("Student@123");
    expect(hash).not.toBe("Student@123");
    await expect(verifyPassword("Student@123", hash)).resolves.toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("Student@123");
    await expect(verifyPassword("wrong-password", hash)).resolves.toBe(false);
  });
});
