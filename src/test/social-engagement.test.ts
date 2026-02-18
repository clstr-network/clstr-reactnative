import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  toggleLike,
  likePost,
  unlikePost,
  getComments,
  createComment,
  toggleCommentLike,
} from "@/lib/social-api";

vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

const { mockFrom, mockAuthGetUser, mockRpc } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockAuthGetUser: vi.fn(),
  mockRpc: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: mockFrom,
    rpc: mockRpc,
    auth: {
      getUser: mockAuthGetUser,
    },
  },
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

describe("social-api engagement (likes/comments)", () => {
  const userId = "550e8400-e29b-41d4-a716-446655440000";
  const postId = "11111111-1111-1111-8111-111111111111";
  const commentId1 = "22222222-2222-2222-8222-222222222222";
  const commentId2 = "33333333-3333-3333-8333-333333333333";
  const commentId3 = "44444444-4444-4444-8444-444444444444";

  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReset();
    mockAuthGetUser.mockReset();
    mockRpc.mockReset();
  });

  const mockCollegeDomainLookup = (domain = "example.edu") => {
    mockFrom.mockImplementationOnce(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { college_domain: domain }, error: null }),
    }));
  };

  const mockPostLookup = (domain = "example.edu") => {
    mockFrom.mockImplementationOnce(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: postId, college_domain: domain }, error: null }),
    }));
  };

  const mockCommentLookup = (domain = "example.edu", id = commentId1) => {
    mockFrom.mockImplementationOnce(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id, post_id: postId, college_domain: domain }, error: null }),
    }));
  };

  describe("toggleLike", () => {
    it("unlikes when an existing like row exists", async () => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: userId } },
      });
      mockRpc.mockResolvedValue({
        data: {
          action: "removed",
          reaction: null,
          total_reactions: 0,
          top_reactions: [],
        },
        error: null,
      });

      const out = await toggleLike(postId, userId);
      expect(out).toEqual({ liked: false });
      expect(mockRpc).toHaveBeenCalledWith("toggle_reaction", {
        p_post_id: postId,
        p_reaction_type: "like",
      });
    });

    it("likes when no existing like row exists", async () => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: userId } },
      });
      mockRpc.mockResolvedValue({
        data: {
          action: "added",
          reaction: "like",
          total_reactions: 1,
          top_reactions: [{ type: "like", count: 1 }],
        },
        error: null,
      });

      const out = await toggleLike(postId, userId);
      expect(out).toEqual({ liked: true });
      expect(mockRpc).toHaveBeenCalledTimes(1);
    });

    it("wraps errors with a user-friendly message", async () => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: userId } },
      });
      mockRpc.mockResolvedValue({
        data: null,
        error: new Error("db down"),
      });

      await expect(toggleLike(postId, userId)).rejects.toMatchObject({
        message: "Unable to update your reaction. Please try again.",
        originalMessage: "db down",
      });
    });
  });

  describe("likePost/unlikePost", () => {
    it("likePost returns liked:true without inserting if already liked", async () => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: userId } },
      });
      mockRpc.mockResolvedValueOnce({
        data: "like",
        error: null,
      });

      const out = await likePost(postId);
      expect(out).toEqual({ liked: true });
      expect(mockRpc).toHaveBeenCalledWith("get_user_reaction", { p_post_id: postId });
      expect(mockRpc).toHaveBeenCalledTimes(1);
    });

    it("likePost inserts when not already liked", async () => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: userId } },
      });

      mockRpc
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({
          data: {
            action: "added",
            reaction: "like",
            total_reactions: 1,
            top_reactions: [{ type: "like", count: 1 }],
          },
          error: null,
        });

      const out = await likePost(postId);
      expect(out).toEqual({ liked: true });
      expect(mockRpc).toHaveBeenCalledTimes(2);
    });

    it("unlikePost deletes like row for current user", async () => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: userId } },
      });

      const deleteBuilder = {
        delete: vi.fn().mockReturnThis(),
        ...makeEqChainBuilder(2, { error: null }),
      };
      mockFrom.mockImplementationOnce(() => deleteBuilder);

      const out = await unlikePost(postId);
      expect(out).toEqual({ liked: false });
      expect(deleteBuilder.delete).toHaveBeenCalled();
      expect(deleteBuilder.eq).toHaveBeenCalledTimes(2);
    });
  });

  describe("getComments", () => {
    it("builds a nested comment tree and marks liked comments", async () => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: userId } },
      });

      const comments = [
        { id: commentId1, post_id: postId, parent_id: null, content: "root", created_at: "2024-01-01" },
        { id: commentId2, post_id: postId, parent_id: commentId1, content: "reply", created_at: "2024-01-02" },
        { id: commentId3, post_id: postId, parent_id: null, content: "root2", created_at: "2024-01-03" },
      ];

      mockFrom
        .mockImplementationOnce(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: comments, error: null }),
        }))
        .mockImplementationOnce(() => ({
          // profiles query
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: [], error: null }),
        }))
        .mockImplementationOnce(() => ({
          // comment_likes query
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: [{ comment_id: commentId2 }], error: null }),
        }));

      const out = await getComments(postId);
      expect(Array.isArray(out)).toBe(true);
      expect(out).toHaveLength(2);

      const first = (out as any[])[0];
      expect(first.id).toBe(commentId1);
      expect(first.liked).toBe(false);
      expect(first.replies).toHaveLength(1);
      expect(first.replies[0].id).toBe(commentId2);
      expect(first.replies[0].liked).toBe(true);
    });

    it("returns flat comments when no user is authenticated", async () => {
      mockAuthGetUser.mockResolvedValue({ data: { user: null } });

      const comments = [{ id: commentId1, post_id: postId, parent_id: null, content: "root", user_id: userId }];
      mockFrom
        .mockImplementationOnce(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: comments, error: null }),
        }))
        .mockImplementationOnce(() => ({
          // profiles query
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: [], error: null }),
        }));

      const out = await getComments(postId);
      expect(out).toHaveLength(1);
      expect((out as any[])[0].id).toBe(commentId1);
    });
  });

  describe("createComment", () => {
    it("throws when not authenticated", async () => {
      mockAuthGetUser.mockResolvedValue({ data: { user: null } });
      await expect(createComment({ post_id: postId, content: "hi" })).rejects.toThrow("User not authenticated");
    });

    it("inserts comment with current user_id", async () => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: userId } },
      });

      mockCollegeDomainLookup();
      mockPostLookup();
      mockFrom
        .mockImplementationOnce(() => ({
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: commentId1, content: "hello", user_id: userId },
            error: null,
          }),
        }))
        .mockImplementationOnce(() => ({
          // profiles query
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: userId, full_name: "Test User", avatar_url: null, role: "Student" },
            error: null,
          }),
        }));

      const out = await createComment({ post_id: postId, content: "hello" });
      expect((out as any).user_id).toBe(userId);
    });
  });

  describe("toggleCommentLike", () => {
    it("unlikes when a like already exists", async () => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: userId } },
      });

      mockCollegeDomainLookup();
      mockCommentLookup();
      mockFrom
        .mockImplementationOnce(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: "cl-1" }, error: null }),
        }))
        .mockImplementationOnce(() => ({
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ error: null }),
        }));

      const out = await toggleCommentLike(commentId1);
      expect(out).toEqual({ liked: false });
    });

    it("likes when no like exists", async () => {
      mockAuthGetUser.mockResolvedValue({
        data: { user: { id: userId } },
      });

      mockCollegeDomainLookup();
      mockCommentLookup();
      mockFrom
        .mockImplementationOnce(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }))
        .mockImplementationOnce(() => ({
          insert: vi.fn().mockResolvedValue({ error: null }),
        }));

      const out = await toggleCommentLike(commentId1);
      expect(out).toEqual({ liked: true });
    });
  });
});
