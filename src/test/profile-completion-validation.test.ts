import { describe, expect, it } from "vitest";
import {
  calculateProfileCompletion,
  getMissingProfileFields,
  isProfileComplete,
  validateProfileData,
} from "@/lib/profile";

describe("profile utilities", () => {
  describe("calculateProfileCompletion", () => {
    it("returns the baseline score for empty fields", () => {
      expect(calculateProfileCompletion({})).toBe(10);
    });

    it("caps completion at 100", () => {
      const score = calculateProfileCompletion({
        fullName: "Ada Lovelace",
        university: "Example University",
        major: "CS",
        avatarUrl: "https://example.com/a.png",
        graduationYear: "2025",
        bio: "x".repeat(200),
        interests: ["a", "b", "c", "d"],
        location: "Remote",
        headline: "Engineer",
        phone: "123",
        role: "Student",
      });

      expect(score).toBe(100);
    });

    it("counts bio only when long enough and interests only when >= 3", () => {
      const shortBioScore = calculateProfileCompletion({
        fullName: "Test User",
        university: "Uni",
        major: "Major",
        avatarUrl: "https://example.com/a.png",
        bio: "too short",
        interests: ["one", "two"],
      });

      const longBioScore = calculateProfileCompletion({
        fullName: "Test User",
        university: "Uni",
        major: "Major",
        avatarUrl: "https://example.com/a.png",
        bio: "x".repeat(31),
        interests: ["one", "two", "three"],
      });

      expect(longBioScore).toBeGreaterThan(shortBioScore);
    });
  });

  describe("isProfileComplete", () => {
    it("returns false for null profile", () => {
      expect(isProfileComplete(null)).toBe(false);
    });

    it("requires at least 70% completion", () => {
      expect(isProfileComplete({ profile_completion: 69 } as any)).toBe(false);
      expect(isProfileComplete({ profile_completion: 70 } as any)).toBe(true);
    });
  });

  describe("getMissingProfileFields", () => {
    it("returns a single message when profile is missing", () => {
      expect(getMissingProfileFields(null)).toEqual(["Profile not found"]);
    });

    it("returns the expected missing field labels", () => {
      const missing = getMissingProfileFields({
        full_name: null,
        university: null,
        major: null,
        graduation_year: null,
        bio: "short",
        interests: ["only-one"],
        avatar_url: null,
      } as any);

      expect(missing).toEqual(
        expect.arrayContaining([
          "Full name",
          "University",
          "Major",
          "Graduation year",
          "Bio (at least 30 characters)",
          "At least 3 interests",
          "Profile picture",
        ])
      );
    });
  });

  describe("validateProfileData", () => {
    it("returns errors for invalid lengths and formats", () => {
      const result = validateProfileData({
        full_name: "A",
        bio: "x".repeat(501),
        location: "x".repeat(121),
        headline: "x".repeat(141),
        interests: Array.from({ length: 21 }, (_, i) => `i${i}`),
        email: "not-an-email",
        graduation_year: "1900",
        social_links: {
          linkedin: "bad url",
        } as any,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          "Full name must be at least 2 characters",
          "Bio must be less than 500 characters",
          "Location must be less than 120 characters",
          "Headline must be less than 140 characters",
          "You can select up to 20 interests",
          "Invalid email format",
          expect.stringMatching(/^Graduation year must be between 1950 and /),
          "Invalid URL for linkedin",
        ])
      );
    });

    it("accepts valid data", () => {
      const currentYear = new Date().getFullYear();
      const result = validateProfileData({
        full_name: "Ada Lovelace",
        bio: "x".repeat(100),
        location: "Cambridge",
        headline: "Software Engineer",
        interests: ["A", "B"],
        email: "ada@example.edu",
        graduation_year: String(currentYear),
        social_links: {
          linkedin: "linkedin.com/in/ada",
          github: "https://github.com/ada",
        } as any,
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });
});
