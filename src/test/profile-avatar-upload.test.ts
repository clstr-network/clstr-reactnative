import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { validateAvatarFile, uploadProfileAvatar, ProfileError } from "@/lib/profile";

const { mockStorageFrom, mockUpload, mockGetPublicUrl } = vi.hoisted(() => ({
  mockStorageFrom: vi.fn(),
  mockUpload: vi.fn(),
  mockGetPublicUrl: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    storage: {
      from: mockStorageFrom,
    },
    from: vi.fn(),
  },
}));

const makeFile = (size: number, type: string, name = "avatar.png") => {
  return new File([new Uint8Array(size)], name, { type });
};

describe("profile avatar validation + upload retry", () => {
  const userId = "550e8400-e29b-41d4-a716-446655440000";

  beforeEach(() => {
    vi.clearAllMocks();

    mockStorageFrom.mockReturnValue({
      upload: mockUpload,
      getPublicUrl: mockGetPublicUrl,
    });

    mockGetPublicUrl.mockReturnValue({
      data: { publicUrl: "https://example.test/public/avatar.jpg" },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("validateAvatarFile", () => {
    it("rejects oversized files", () => {
      const out = validateAvatarFile(makeFile(5 * 1024 * 1024 + 1, "image/png"));
      expect(out.valid).toBe(false);
      expect(out.error).toContain("File size must be less than");
    });

    it("rejects unsupported mime types", () => {
      const out = validateAvatarFile(makeFile(100, "text/plain"));
      expect(out).toEqual({ valid: false, error: "File type must be JPEG, PNG, WebP, or GIF" });
    });

    it("accepts supported images", () => {
      const out = validateAvatarFile(makeFile(100, "image/png"));
      expect(out).toEqual({ valid: true });
    });
  });

  describe("uploadProfileAvatar", () => {
    it("throws ProfileError(INVALID_FILE) for invalid file", async () => {
      await expect(uploadProfileAvatar(makeFile(100, "text/plain"), userId)).rejects.toMatchObject({
        name: "ProfileError",
        code: "INVALID_FILE",
      });
    });

    it("does not retry when bucket is missing", async () => {
      mockUpload.mockResolvedValue({ error: { message: "Bucket not found" } });

      await expect(uploadProfileAvatar(makeFile(100, "image/png"), userId, 3)).rejects.toMatchObject({
        name: "ProfileError",
        code: "BUCKET_NOT_FOUND",
      });

      expect(mockUpload).toHaveBeenCalledTimes(1);
    });

    it("retries transient upload failures and eventually returns the public URL", async () => {
      vi.useFakeTimers();

      mockUpload
        .mockResolvedValueOnce({ error: { message: "Temporary failure" } })
        .mockResolvedValueOnce({ error: null });

      const promise = uploadProfileAvatar(makeFile(100, "image/png"), userId, 2);
      await vi.advanceTimersByTimeAsync(1000);
      await expect(promise).resolves.toBe("https://example.test/public/avatar.jpg");

      expect(mockUpload).toHaveBeenCalledTimes(2);
    });

    it("throws a final error after exhausting retries", async () => {
      vi.useFakeTimers();

      mockUpload
        .mockResolvedValueOnce({ error: { message: "Temporary failure" } })
        .mockResolvedValueOnce({ error: { message: "Still failing" } });

      const promise = uploadProfileAvatar(makeFile(100, "image/png"), userId, 2);
      const assertion = expect(promise).rejects.toBeInstanceOf(ProfileError);

      await vi.advanceTimersByTimeAsync(1000);
      await assertion;
      expect(mockUpload).toHaveBeenCalledTimes(2);
    });
  });
});
