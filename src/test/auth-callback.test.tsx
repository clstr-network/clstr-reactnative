import { describe, it, expect, beforeEach, vi } from "vitest";
import { act, render, waitFor } from "@testing-library/react";
import AuthCallback from "@/pages/AuthCallback";

const mockNavigate = vi.fn();

const {
  mockGetSession,
  mockExchangeCodeForSession,
  mockSignOut,
  mockFrom,
  mockToast,
} = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockExchangeCodeForSession: vi.fn(),
  mockSignOut: vi.fn(),
  mockFrom: vi.fn(),
  mockToast: vi.fn(),
}));

let profileSelectResponse: { data: any; error: any };
let profileUpdateResponse: { error: any };
let lastProfileUpdatePayload: any;

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("lucide-react", () => ({
  Loader2: () => null,
}));

vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      exchangeCodeForSession: mockExchangeCodeForSession,
      signOut: mockSignOut,
    },
    from: (table: string) => {
      mockFrom(table);
      if (table === "platform_admins") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }

      if (table !== "profiles") throw new Error(`Unexpected table: ${table}`);

      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockImplementation(() => Promise.resolve(profileSelectResponse)),
        update: vi.fn().mockImplementation((payload: any) => {
          lastProfileUpdatePayload = payload;
          return {
            eq: vi.fn().mockImplementation(() => Promise.resolve(profileUpdateResponse)),
          };
        }),
      };
    },
    rpc: vi.fn().mockResolvedValue({ data: false, error: null }),
  },
}));

describe("AuthCallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();

    lastProfileUpdatePayload = null;
    profileSelectResponse = { data: null, error: null };
    profileUpdateResponse = { error: null };

    // default URL is clean
    window.history.replaceState({}, "", "/auth/callback");
    window.location.hash = "";
    localStorage.clear();
  });

  it("signs out and redirects to /signup when email is unverified for non-OAuth users", async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: "user-1",
            email: "user@example.edu",
            email_confirmed_at: null,
            app_metadata: {},
            user_metadata: {},
          },
        },
      },
      error: null,
    });

    render(<AuthCallback />);

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Email verification required",
          variant: "destructive",
        })
      );
      expect(mockNavigate).toHaveBeenCalledWith(
        "/signup",
        expect.objectContaining({ replace: true })
      );
    });
  });

  it("signs out and redirects to /academic-email-required for non-academic email addresses", async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: "user-1",
            email: "user@gmail.com",
            email_confirmed_at: new Date().toISOString(),
            app_metadata: {},
            user_metadata: {},
          },
        },
      },
      error: null,
    });

    render(<AuthCallback />);

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(
        "/academic-email-required",
        expect.objectContaining({ replace: true })
      );
    });
  });

  it("redirects to /login when PKCE code exchange fails", async () => {
    window.history.replaceState({}, "", "/auth/callback?code=abc");

    mockExchangeCodeForSession.mockResolvedValue({
      data: { session: null },
      error: { message: "bad exchange" },
    });

    render(<AuthCallback />);

    await waitFor(() => {
      expect(mockExchangeCodeForSession).toHaveBeenCalledWith("abc");
      expect(mockNavigate).toHaveBeenCalledWith(
        "/login",
        expect.objectContaining({ replace: true })
      );
    });
  });

  it("updates missing profile domain for OAuth users and redirects to /home when onboarding is complete", async () => {
    profileSelectResponse = {
      data: {
        id: "user-1",
        email: "user@example.edu",
        domain: null,
        college_domain: null,
        onboarding_complete: true,
        full_name: null,
        avatar_url: null,
      },
      error: null,
    };

    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: "user-1",
            email: "user@example.edu",
            email_confirmed_at: null,
            app_metadata: { provider: "google", providers: ["google"] },
            user_metadata: {
              full_name: "OAuth Name",
              avatar_url: "https://example.com/oauth.png",
            },
          },
        },
      },
      error: null,
    });

    render(<AuthCallback />);

    await waitFor(() => {
      expect(lastProfileUpdatePayload).toEqual(
        expect.objectContaining({
          college_domain: "example.edu",
          email: "user@example.edu",
          full_name: "OAuth Name",
          avatar_url: "https://example.com/oauth.png",
        })
      );
      expect(mockNavigate).toHaveBeenCalledWith("/home", { replace: true });
    });
  });

  it("recovers from database error saving new user when a session exists", async () => {
    vi.useFakeTimers();

    window.location.hash =
      "#error=server_error&error_description=" +
      encodeURIComponent("Database error saving new user") +
      "&error_code=unexpected_failure";

    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: "user-1",
            email: "user@example.edu",
            email_confirmed_at: new Date().toISOString(),
            app_metadata: {},
            user_metadata: {},
          },
        },
      },
      error: null,
    });

    render(<AuthCallback />);

    // advance the 1500ms recovery wait (and flush React state updates)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1600);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Welcome!" }));
    expect(mockNavigate).toHaveBeenCalledWith("/onboarding", { replace: true });

    vi.useRealTimers();
  });
});
