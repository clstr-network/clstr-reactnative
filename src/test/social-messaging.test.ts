import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendMessage, getConversations, getMessages, markMessagesAsRead } from "@/lib/social-api";

const { mockSendMessage, mockGetConversations, mockGetMessages, mockMarkMessagesAsRead } = vi.hoisted(() => ({
  mockSendMessage: vi.fn(),
  mockGetConversations: vi.fn(),
  mockGetMessages: vi.fn(),
  mockMarkMessagesAsRead: vi.fn(),
}));

vi.mock("@/lib/messages-api", () => ({
  sendMessage: mockSendMessage,
  getConversations: mockGetConversations,
  getMessages: mockGetMessages,
  markMessagesAsRead: mockMarkMessagesAsRead,
}));

describe("social-api messaging (delegation)", () => {
  const partnerId = "11111111-1111-1111-8111-111111111111";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sendMessage delegates to messages-api", async () => {
    mockSendMessage.mockResolvedValueOnce({ id: "m1" });

    const out = await sendMessage(partnerId, "hello");
    expect(mockSendMessage).toHaveBeenCalledWith(partnerId, "hello");
    expect(out).toMatchObject({ id: "m1" });
  });

  it("getConversations delegates to messages-api", async () => {
    mockGetConversations.mockResolvedValueOnce([{ unreadCount: 1 }]);

    const out = await getConversations();
    expect(mockGetConversations).toHaveBeenCalledWith();
    expect(out).toEqual([{ unreadCount: 1 }]);
  });

  it("getMessages delegates and adapts the return shape", async () => {
    mockGetMessages.mockResolvedValueOnce({ messages: [{ id: "m1" }], nextCursor: null, hasMore: false });

    const out = await getMessages(partnerId, 10);
    expect(mockGetMessages).toHaveBeenCalledWith(partnerId, 10);
    expect(out).toEqual([{ id: "m1" }]);
  });

  it("markMessagesAsRead delegates to messages-api", async () => {
    mockMarkMessagesAsRead.mockResolvedValueOnce(undefined);

    await expect(markMessagesAsRead(partnerId)).resolves.toBeUndefined();
    expect(mockMarkMessagesAsRead).toHaveBeenCalledWith(partnerId);
  });
});
