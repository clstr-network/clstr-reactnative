import { describe, it, expect, vi, beforeEach } from "vitest";
import { deactivateOwnAccount, deleteOwnAccount } from "@/lib/account";

vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

const { mockAuthGetUser, mockInvoke } = vi.hoisted(() => ({
  mockAuthGetUser: vi.fn(),
  mockInvoke: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: mockAuthGetUser },
    functions: { invoke: mockInvoke },
  },
}));

describe("deactivateOwnAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("invokes the delete-account edge function when authenticated", async () => {
    mockAuthGetUser.mockResolvedValue({
      data: { user: { id: "550e8400-e29b-41d4-a716-446655440000" } },
      error: null,
    });
    mockInvoke.mockResolvedValue({ error: null });

    await expect(deactivateOwnAccount()).resolves.toBeUndefined();
    expect(mockInvoke).toHaveBeenCalledWith("delete-account", { body: {} });
  });

  it("wraps unauthenticated errors with a user-friendly message", async () => {
    mockAuthGetUser.mockResolvedValue({ data: { user: null }, error: null });

    await expect(deactivateOwnAccount()).rejects.toMatchObject({
      message: "Failed to deactivate account. Please try again.",
      originalMessage: "User not authenticated",
    });
  });

  it("wraps invoke failures with a user-friendly message", async () => {
    mockAuthGetUser.mockResolvedValue({
      data: { user: { id: "550e8400-e29b-41d4-a716-446655440000" } },
      error: null,
    });
    mockInvoke.mockResolvedValue({ error: new Error("function failed") });

    await expect(deactivateOwnAccount()).rejects.toMatchObject({
      message: "Failed to deactivate account. Please try again.",
      originalMessage: "function failed",
    });
  });

  it("deleteOwnAccount alias works identically", async () => {
    mockAuthGetUser.mockResolvedValue({
      data: { user: { id: "550e8400-e29b-41d4-a716-446655440000" } },
      error: null,
    });
    mockInvoke.mockResolvedValue({ error: null });

    await expect(deleteOwnAccount()).resolves.toBeUndefined();
    expect(mockInvoke).toHaveBeenCalledWith("delete-account", { body: {} });
  });
});
