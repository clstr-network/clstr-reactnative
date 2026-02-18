import { describe, it, expect, beforeEach, vi } from "vitest";
import { calculateProfileCompletion, updateProfileRecord } from "@/lib/profile";

const { mockFrom } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
}));

let selectResponse: { data: any; error: any };
let updateEqResponse: { error: any };
let lastUpdatePayload: any;

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      if (table !== "profiles") {
        throw new Error(`Unexpected table: ${table}`);
      }

      // Called twice: once for select/maybeSingle, once for update/eq
      const callIndex = mockFrom.mock.calls.length;
      mockFrom(table);

      if (callIndex === 0) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockImplementation(() => Promise.resolve(selectResponse)),
        };
      }

      return {
        update: vi.fn().mockImplementation((payload: any) => {
          lastUpdatePayload = payload;
          return {
            eq: vi.fn().mockImplementation(() => Promise.resolve(updateEqResponse)),
          };
        }),
      };
    },
  },
}));

describe("updateProfileRecord", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lastUpdatePayload = null;

    selectResponse = {
      data: {
        full_name: "Existing User",
        university: "Existing University",
        major: "Existing Major",
        graduation_year: "2024",
        bio: "Existing bio that is definitely longer than thirty characters.",
        interests: ["React", "TypeScript"],
        avatar_url: "https://example.com/avatar.png",
      },
      error: null,
    };

    updateEqResponse = { error: null };
  });

  it("normalizes fields, sanitizes social links, maps role, and recalculates profile completion", async () => {
    await updateProfileRecord("user-123", {
      full_name: "  New Name  ",
      bio: "  ",
      location: "  New York  ",
      headline: "  Engineer  ",
      university: "  New University  ",
      major: "  New Major  ",
      interests: [" React ", "React", "  ", "TypeScript"],
      social_links: {
        linkedin: " linkedin.com/in/new ",
        github: "bad url",
        empty: "   ",
      },
      role: "alumni",
    } as any);

    expect(mockFrom).toHaveBeenCalledWith("profiles");
    expect(lastUpdatePayload).toBeTruthy();

    // Normalization
    expect(lastUpdatePayload.full_name).toBe("New Name");
    expect(lastUpdatePayload.bio).toBeNull();
    expect(lastUpdatePayload.location).toBe("New York");
    expect(lastUpdatePayload.headline).toBe("Engineer");
    expect(lastUpdatePayload.university).toBe("New University");
    expect(lastUpdatePayload.major).toBe("New Major");

    // Interests normalized (deduped, trimmed)
    expect(lastUpdatePayload.interests).toEqual(["React", "TypeScript"]);

    // Social links sanitized and invalid ignored
    expect(lastUpdatePayload.social_links).toEqual({
      linkedin: "https://linkedin.com/in/new",
    });

    // Role mapping
    expect(lastUpdatePayload.role).toBe("Alumni");

    // Completion recalculation uses updated fields + existing avatar_url
    const expectedCompletion = calculateProfileCompletion({
      fullName: "New Name",
      university: "New University",
      major: "New Major",
      graduationYear: "2024",
      bio: selectResponse.data.bio,
      interests: ["React", "TypeScript"],
      avatarUrl: "https://example.com/avatar.png",
    });

    expect(lastUpdatePayload.profile_completion).toBe(expectedCompletion);
  });

  it("throws a validation error for invalid updates", async () => {
    await expect(
      updateProfileRecord("user-123", {
        full_name: "A",
      } as any)
    ).rejects.toThrow(/Invalid update data/);

    expect(lastUpdatePayload).toBeNull();
  });
});
