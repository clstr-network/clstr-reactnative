import { describe, it, expect } from "vitest";
import {
  ROLE_PERMISSIONS,
  canAccessFeature,
  canCreateContentType,
  canPerformAction,
  canTransitionToRole,
  getAllowedActions,
  getPermissions,
  getRequiredDocuments,
  getRoleDescription,
  getRoleDisplayName,
  hasPermission,
  requiresVerification,
  type UserRole,
} from "@/lib/permissions";

describe("permissions (RBAC)", () => {
  it("defines permissions for all roles", () => {
    const roles: UserRole[] = ["Student", "Alumni", "Faculty", "Club", "Organization"];
    for (const role of roles) {
      expect(ROLE_PERMISSIONS[role]).toBeDefined();
      expect(ROLE_PERMISSIONS[role]).toHaveProperty("canCreatePost");
    }
  });

  it("getPermissions returns the permission set", () => {
    expect(getPermissions("Student")).toBe(ROLE_PERMISSIONS.Student);
  });

  it("hasPermission returns false for missing role", () => {
    expect(hasPermission(null, "canCreatePost")).toBe(false);
    expect(hasPermission(undefined, "canCreatePost")).toBe(false);
  });

  it("canPerformAction delegates to hasPermission", () => {
    expect(canPerformAction("Student", "canCreatePost")).toBe(true);
    expect(canPerformAction("Student", "canViewAnalytics")).toBe(false);
  });

  it("getAllowedActions returns only allowed action keys", () => {
    const allowed = getAllowedActions("Student");
    expect(allowed).toContain("canCreatePost");
    expect(allowed).not.toContain("canVerifyUsers");
  });

  it("canCreateContentType maps to the correct permission", () => {
    expect(canCreateContentType("Student", "post")).toBe(true);
    expect(canCreateContentType("Student", "job")).toBe(false);
    expect(canCreateContentType(null, "post")).toBe(false);
  });

  it("canAccessFeature maps to the correct permission", () => {
    expect(canAccessFeature("Student", "analytics")).toBe(false);
    expect(canAccessFeature("Faculty", "analytics")).toBe(true);
    expect(canAccessFeature(undefined, "courses")).toBe(false);
  });

  it("role display name is stable", () => {
    expect(getRoleDisplayName("Alumni")).toBe("Alumni");
  });

  it("role descriptions exist", () => {
    expect(getRoleDescription("Student")).toContain("student");
    expect(getRoleDescription("Organization")).toContain("organization");
  });

  it("role transitions enforce allowed transitions", () => {
    expect(canTransitionToRole("Student", "Alumni")).toBe(true);
    expect(canTransitionToRole("Alumni", "Student")).toBe(false);
    expect(canTransitionToRole("Club", "Student")).toBe(false);
  });

  it("requiresVerification is true for Faculty and Organization", () => {
    expect(requiresVerification("Faculty")).toBe(true);
    expect(requiresVerification("Organization")).toBe(true);
    expect(requiresVerification("Student")).toBe(false);
  });

  it("getRequiredDocuments returns requirements for verification", () => {
    expect(getRequiredDocuments("Student")).toEqual([]);
    expect(getRequiredDocuments("Faculty").length).toBeGreaterThan(0);
  });
});
