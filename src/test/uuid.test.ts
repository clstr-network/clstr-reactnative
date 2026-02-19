import { describe, it, expect } from "vitest";
import { assertValidUuid, isValidUuid } from "@clstr/shared/utils/uuid";

describe("uuid", () => {
  describe("isValidUuid", () => {
    it("accepts RFC 4122 v4 UUIDs", () => {
      expect(isValidUuid("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    });

    it("rejects invalid UUIDs", () => {
      expect(isValidUuid("not-a-uuid")).toBe(false);
      expect(isValidUuid("550e8400e29b41d4a716446655440000")).toBe(false);
    });

    it("rejects wrong version/variant", () => {
      // version nibble must be 1-5; this has 0
      expect(isValidUuid("550e8400-e29b-01d4-a716-446655440000")).toBe(false);
      // variant must be 8,9,a,b; this has 7
      expect(isValidUuid("550e8400-e29b-41d4-7716-446655440000")).toBe(false);
    });
  });

  describe("assertValidUuid", () => {
    it("does not throw for valid UUID", () => {
      expect(() => assertValidUuid("550e8400-e29b-41d4-a716-446655440000")).not.toThrow();
    });

    it("throws with label for invalid UUID", () => {
      expect(() => assertValidUuid("bad", "profileId")).toThrow("Invalid profileId");
    });
  });
});
