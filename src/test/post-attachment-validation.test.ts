import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPost } from "@/lib/social-api";

vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

const { mockFrom } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
}));

const makeProfilesQuery = (collegeDomain: string | null) => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockResolvedValue({
    data: collegeDomain ? { college_domain: collegeDomain } : null,
    error: null,
  }),
});

// Minimal Supabase mock for createPost()
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(() =>
        Promise.resolve({
          data: { user: { id: "550e8400-e29b-41d4-a716-446655440000", email: "user@uni.edu" } },
          error: null,
        })
      ),
    },
    from: mockFrom,
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: "https://example.com/asset" } })),
      })),
    },
  },
}));

describe("createPost - attachment validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // SKIP: Implementation changed - college domain is now optional for creating posts
  // Posts are associated with the user, domain filtering happens on read
  it.skip("rejects when college domain is missing", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") return makeProfilesQuery(null);
      if (table === "posts") {
        // Should not reach here - should fail at domain check
        return {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: new Error("Should not reach") }),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    });

    try {
      await createPost({ content: "Hello" });
      throw new Error("Expected createPost to throw");
    } catch (err) {
      const error = err as Error & { originalMessage?: string };
      expect(error.message).toBe("Unable to create your post right now. Please try again.");
      expect(error.originalMessage).toBe(
        "College domain missing. Complete your profile to access the feed."
      );
    }
  });

  it("rejects oversized image attachments (>20MB)", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") return makeProfilesQuery("uni.edu");
      throw new Error(`Unexpected table: ${table}`);
    });

    const file = new File(["x"], "big.jpg", { type: "image/jpeg" });
    // Avoid allocating a huge buffer; override size directly
    Object.defineProperty(file, "size", { value: 20 * 1024 * 1024 + 1 });

    try {
      await createPost({
        content: "Post with big image",
        attachment: { type: "image", file },
      });
      throw new Error("Expected createPost to throw");
    } catch (err) {
      const error = err as Error & { originalMessage?: string };
      expect(error.message).toBe("Unable to create your post right now. Please try again.");
      expect(error.originalMessage).toBe("Attachment is too large. Maximum size is 20MB.");
    }
  });

  it("returns a helpful error when the post-assets bucket is missing", async () => {
    const upload = vi.fn(() => Promise.resolve({ error: { message: "Bucket not found" } }));

    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") return makeProfilesQuery("uni.edu");
      throw new Error(`Unexpected table: ${table}`);
    });

    const { supabase } = await import("@/integrations/supabase/client");
    // Patch the mocked storage handler for this test
    (supabase.storage.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      upload,
      getPublicUrl: vi.fn(() => ({ data: { publicUrl: "https://example.com/asset" } })),
    });

    const file = new File(["x"], "small.jpg", { type: "image/jpeg" });

    try {
      await createPost({
        content: "Post with image",
        attachment: { type: "image", file },
      });
      throw new Error("Expected createPost to throw");
    } catch (err) {
      const error = err as Error & { originalMessage?: string };
      expect(error.message).toBe("Unable to create your post right now. Please try again.");
      expect(error.originalMessage).toBe(
        "Post media bucket missing. Create a 'post-media' bucket in Supabase storage."
      );
    }
  });
});
