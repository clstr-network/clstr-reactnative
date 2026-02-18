import { describe, it, expect, afterEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAcademicEmailValidator } from "@/hooks/useAcademicEmailValidator";

describe("useAcademicEmailValidator", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects empty email", () => {
    const { result } = renderHook(() => useAcademicEmailValidator());

    expect(result.current.validate("")).toEqual({
      valid: false,
      message: "Email is required",
    });
  });

  it("rejects malformed email", () => {
    const { result } = renderHook(() => useAcademicEmailValidator());

    expect(result.current.validate("not-an-email")).toEqual({
      valid: false,
      message: "Enter a valid email address",
    });
  });

  it("rejects non-academic domains when not allowlisted", () => {
    const { result } = renderHook(() => useAcademicEmailValidator());

    const out = result.current.validate("user@gmail.com");
    expect(out.valid).toBe(false);
    expect(out.domain).toBe("gmail.com");
    expect(out.message).toContain("not recognized as an academic email");
  });

  it("accepts custom allowlisted domains via VITE_ALLOWED_EMAIL_DOMAINS", () => {
    vi.stubEnv("VITE_ALLOWED_EMAIL_DOMAINS", "alumni.org, partners.example");

    const { result } = renderHook(() => useAcademicEmailValidator());

    expect(result.current.validate("user@alumni.org")).toEqual({
      valid: true,
      domain: "alumni.org",
    });
  });

  it("rejects emails containing spaces (even if academic)", () => {
    const { result } = renderHook(() => useAcademicEmailValidator());

    const out = result.current.validate("student@university.edu ");
    expect(out.valid).toBe(false);
    expect(out.message).toBe("Email addresses cannot contain spaces.");
  });
});
