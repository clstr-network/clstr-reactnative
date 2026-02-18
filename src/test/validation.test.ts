import { describe, it, expect } from "vitest";
import { getDomainFromEmail, isSameInstitution, isValidAcademicEmail } from "@/lib/validation";

describe("validation (email/domain)", () => {
  describe("getDomainFromEmail", () => {
    it("returns lowercased domain", () => {
      expect(getDomainFromEmail("user@Example.EDU")).toBe("example.edu");
    });

    it("returns empty string when missing @", () => {
      expect(getDomainFromEmail("not-an-email")).toBe("");
    });

    it("returns empty string when domain missing", () => {
      expect(getDomainFromEmail("user@")).toBe("");
    });
  });

  describe("isSameInstitution", () => {
    it("returns true for same domain", () => {
      expect(isSameInstitution("a@uni.edu", "b@uni.edu")).toBe(true);
    });

    it("returns false for different domains", () => {
      expect(isSameInstitution("a@uni.edu", "b@other.edu")).toBe(false);
    });
  });

  describe("isValidAcademicEmail", () => {
    it("accepts .edu domains", () => {
      expect(isValidAcademicEmail("student@university.edu")).toBe(true);
    });

    it("accepts .ac.<cc> domains", () => {
      expect(isValidAcademicEmail("student@college.ac.in")).toBe(true);
    });

    it("accepts .edu.<cc> domains", () => {
      expect(isValidAcademicEmail("student@college.edu.in")).toBe(true);
    });

    it("rejects common consumer domains", () => {
      expect(isValidAcademicEmail("user@gmail.com")).toBe(false);
      expect(isValidAcademicEmail("user@yahoo.com")).toBe(false);
    });

    it("rejects invalid emails", () => {
      expect(isValidAcademicEmail("")).toBe(false);
      expect(isValidAcademicEmail("missing-at-symbol")).toBe(false);
      expect(isValidAcademicEmail("user@")).toBe(false);
    });
  });
});
