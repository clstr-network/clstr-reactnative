import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useDeactivateAccount, useDeleteAccount } from "@/hooks/useDeleteAccount";

const { mockDeactivateOwnAccount, mockSignOut } = vi.hoisted(() => ({
  mockDeactivateOwnAccount: vi.fn(),
  mockSignOut: vi.fn(),
}));

vi.mock("@/lib/account", () => ({
  deactivateOwnAccount: mockDeactivateOwnAccount,
  deleteOwnAccount: mockDeactivateOwnAccount, // alias points to same fn
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signOut: mockSignOut,
    },
  },
}));

describe("useDeactivateAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("clears query cache and signs out locally after successful deactivation", async () => {
    mockDeactivateOwnAccount.mockResolvedValue(undefined);
    mockSignOut.mockResolvedValue(undefined);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const clearSpy = vi.spyOn(queryClient, "clear");

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useDeactivateAccount(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(mockDeactivateOwnAccount).toHaveBeenCalledTimes(1);
    expect(clearSpy).toHaveBeenCalledTimes(1);
    expect(mockSignOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("does not sign out if deactivation fails", async () => {
    mockDeactivateOwnAccount.mockRejectedValue(new Error("boom"));

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const clearSpy = vi.spyOn(queryClient, "clear");

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useDeactivateAccount(), { wrapper });

    await expect(
      act(async () => {
        await result.current.mutateAsync();
      })
    ).rejects.toThrow("boom");

    expect(clearSpy).not.toHaveBeenCalled();
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it("useDeleteAccount alias works identically", async () => {
    mockDeactivateOwnAccount.mockResolvedValue(undefined);
    mockSignOut.mockResolvedValue(undefined);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useDeleteAccount(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(mockDeactivateOwnAccount).toHaveBeenCalledTimes(1);
  });
});
