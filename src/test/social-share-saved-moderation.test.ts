import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  sharePost,
  saveItem,
  unsaveItem,
  checkIfSaved,
  toggleSavePost,
  getSavedPosts,
  reportPost,
  hidePost,
} from "@/lib/social-api";

vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

const { mockFrom, mockAuthGetUser, mockRpc, mockSendMessage } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockAuthGetUser: vi.fn(),
  mockRpc: vi.fn(),
  mockSendMessage: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: mockFrom,
    auth: {
      getUser: mockAuthGetUser,
    },
    rpc: mockRpc,
  },
}));

vi.mock("@/lib/messages-api", () => ({
  sendMessage: mockSendMessage,
  getConversations: vi.fn(),
  getMessages: vi.fn(),
  markMessagesAsRead: vi.fn(),
}));

const makeEqChainBuilder = (eqCountToResolve: number, resolved: unknown) => {
  const builder: Record<string, unknown> = {};
  let eqCalls = 0;
  (builder as any).eq = vi.fn().mockImplementation(() => {
    eqCalls += 1;
    if (eqCalls >= eqCountToResolve) {
      return Promise.resolve(resolved);
    }
    return builder;
  });
  return builder as any;
};

describe("social-api share/saved/moderation", () => {
  const userId = "550e8400-e29b-41d4-a716-446655440000";
  const postId1 = "11111111-1111-1111-8111-111111111111";
  const postId2 = "22222222-2222-2222-8222-222222222222";
  const savedId1 = "33333333-3333-3333-8333-333333333333";
  const receiverId = "44444444-4444-4444-8444-444444444444";

  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReset();
    mockAuthGetUser.mockReset();
    mockRpc.mockReset();
    mockRpc.mockResolvedValue({ data: null, error: null });
    mockAuthGetUser.mockResolvedValue({ data: { user: { id: userId } } });
    mockSendMessage.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("reportPost/hidePost", () => {
    it("reportPost no-ops if post_reports table is missing", async () => {
      mockFrom.mockImplementationOnce(() => ({
        insert: vi.fn().mockResolvedValue({ error: { code: "42P01" } }),
      }));

      await expect(reportPost(postId1, "spam")).rejects.toMatchObject({ code: "42P01" });
    });

    it("hidePost no-ops if hidden_posts table is missing", async () => {
      mockFrom.mockImplementationOnce(() => ({
        insert: vi.fn().mockResolvedValue({ error: { code: "42P01" } }),
      }));

      await expect(hidePost(postId1)).rejects.toMatchObject({ code: "42P01" });
    });
  });

  describe("saveItem/unsaveItem/checkIfSaved/toggleSavePost", () => {
    it("saveItem returns alreadySaved on unique constraint violation", async () => {
      mockFrom.mockImplementationOnce(() => ({
        insert: vi.fn().mockResolvedValue({ error: { code: "23505" } }),
      }));

      const out = await saveItem("post", postId1);
      expect(out).toEqual({ alreadySaved: true });
    });

    it("saveItem returns alreadySaved:false on success", async () => {
      mockFrom.mockImplementationOnce(() => ({
        insert: vi.fn().mockResolvedValue({ error: null }),
      }));

      const out = await saveItem("post", postId1);
      expect(out).toEqual({ alreadySaved: false });
    });

    it("unsaveItem deletes by user_id/type/item_id", async () => {
      const deleteBuilder = {
        delete: vi.fn().mockReturnThis(),
        ...makeEqChainBuilder(3, { error: null }),
      };

      mockFrom.mockImplementationOnce(() => deleteBuilder);

      await expect(unsaveItem("post", postId1)).resolves.toBeUndefined();
      expect(deleteBuilder.delete).toHaveBeenCalled();
      expect(deleteBuilder.eq).toHaveBeenCalledTimes(3);
    });

    it("checkIfSaved returns false when unauthenticated", async () => {
      mockAuthGetUser.mockResolvedValueOnce({ data: { user: null } });
      const out = await checkIfSaved("post", postId1);
      expect(out).toBe(false);
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it("checkIfSaved returns false when no row exists", async () => {
      mockFrom.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } }),
      }));

      const out = await checkIfSaved("post", postId1);
      expect(out).toBe(false);
    });

    it("checkIfSaved returns true when a row exists", async () => {
      mockFrom.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: savedId1 }, error: null }),
      }));

      const out = await checkIfSaved("post", postId1);
      expect(out).toBe(true);
    });

    it("toggleSavePost unsaves when already saved", async () => {
      mockFrom
        .mockImplementationOnce(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: savedId1 }, error: null }),
        }))
        .mockImplementationOnce(() => ({
          delete: vi.fn().mockReturnThis(),
          ...makeEqChainBuilder(3, { error: null }),
        }));

      const out = await toggleSavePost(postId1);
      expect(out).toEqual({ saved: false });
      expect(mockFrom).toHaveBeenCalledTimes(2);
    });

    it("toggleSavePost saves when not already saved", async () => {
      mockFrom
        .mockImplementationOnce(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } }),
        }))
        .mockImplementationOnce(() => ({
          insert: vi.fn().mockResolvedValue({ error: null }),
        }));

      const out = await toggleSavePost(postId1);
      expect(out).toEqual({ saved: true });
      expect(mockFrom).toHaveBeenCalledTimes(2);
    });
  });

  describe("getSavedPosts", () => {
    it("returns posts decorated with liked flag", async () => {
      const savedItems = [
        { item_id: postId1, created_at: "2024-01-02" },
        { item_id: postId2, created_at: "2024-01-01" },
      ];

      mockFrom
        .mockImplementationOnce(() => ({
          // saved_items query
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: savedItems, error: null }),
        }))
        .mockImplementationOnce(() => ({
          // posts query
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({
            data: [
              { id: postId1, content: "one", user_id: userId },
              { id: postId2, content: "two", user_id: userId },
            ],
            error: null,
          }),
        }))
        .mockImplementationOnce(() => ({
          // profiles query
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({
            data: [{ id: userId, full_name: "Test", avatar_url: null, role: "Student", domain: null }],
            error: null,
          }),
        }))
        .mockImplementationOnce(() => ({
          // post_likes query
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: [{ post_id: postId2 }], error: null }),
        }));

      const out = await getSavedPosts();
      expect(out).toHaveLength(2);
      const p1 = out.find((p: any) => p.id === postId1);
      const p2 = out.find((p: any) => p.id === postId2);
      expect(p1?.liked).toBe(false);
      expect(p2?.liked).toBe(true);
    });
  });

  describe("sharePost", () => {
    it("dm share sends a message containing the post link and increments share count", async () => {
      const postLookupBuilder = {
        select: vi.fn(),
        eq: vi.fn(),
        single: vi.fn().mockResolvedValue({
          data: { id: "55555555-5555-5555-8555-555555555555" },
          error: null,
        }),
      };
      postLookupBuilder.select.mockReturnValue(postLookupBuilder);
      postLookupBuilder.eq.mockReturnValue(postLookupBuilder);

      mockFrom
        .mockImplementationOnce(() => postLookupBuilder)
        .mockImplementationOnce(() => ({
          insert: vi.fn().mockResolvedValue({ error: null }),
        }));

      await sharePost({
        original_post_id: postId1,
        share_type: "dm",
        receiver_id: receiverId,
        content: "check this",
      });

      expect(mockSendMessage).toHaveBeenCalledWith(
        receiverId,
        expect.stringContaining(`/post/${postId1}`)
      );
      expect(mockFrom).toHaveBeenCalledTimes(2);
    });
  });
});
