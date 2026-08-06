import { describe, expect, test } from "vitest";
import { isAdminAuthorizedByKey } from "@/lib/admin-auth";

describe("admin auth", () => {
  test("accepts correct key", () => {
    expect(isAdminAuthorizedByKey("abc", "abc")).toBe(true);
  });

  test("rejects empty expected key", () => {
    expect(isAdminAuthorizedByKey("abc", undefined)).toBe(false);
  });

  test("rejects mismatched key", () => {
    expect(isAdminAuthorizedByKey("abc", "def")).toBe(false);
  });
});
