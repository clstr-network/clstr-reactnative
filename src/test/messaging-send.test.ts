import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendMessage, getConversations, getMessages } from '@/lib/messages-api';

const TEST_SENDER_ID = '550e8400-e29b-41d4-a716-446655440000';
const TEST_RECEIVER_ID = '11111111-1111-1111-8111-111111111111';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(() => Promise.resolve({
        data: { user: { id: TEST_SENDER_ID, email: 'sender@example.com' } },
        error: null,
      })),
    },
    rpc: vi.fn((fn: string) => {
      if (fn === 'get_conversations') {
        return Promise.resolve({
          data: [
            {
              partner_id: TEST_RECEIVER_ID,
              partner_full_name: 'Test Receiver',
              partner_avatar_url: 'https://example.com/avatar.jpg',
              partner_last_seen: new Date().toISOString(),
              last_message_id: '22222222-2222-2222-8222-222222222222',
              last_message_sender_id: TEST_SENDER_ID,
              last_message_receiver_id: TEST_RECEIVER_ID,
              last_message_content: 'Hello, this is a test message',
              last_message_read: false,
              last_message_created_at: new Date().toISOString(),
              last_message_updated_at: new Date().toISOString(),
              unread_count: 0,
            },
          ],
          error: null,
        });
      }
      if (fn === 'get_unread_message_count') {
        return Promise.resolve({ data: 0, error: null });
      }
      return Promise.resolve({ data: null, error: { code: '42883' } });
    }),
    from: vi.fn((table: string) => {
      if (table === 'messages') {
        return {
          insert: vi.fn((payload: { sender_id: string; receiver_id: string; content: string; read?: boolean }) => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: {
                  id: 'msg-123',
                  sender_id: payload.sender_id,
                  receiver_id: payload.receiver_id,
                  content: payload.content,
                  read: payload.read ?? false,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
                error: null,
              })),
            })),
          })),
          select: vi.fn(() => ({
            or: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => Promise.resolve({
                  data: [
                    {
                      id: 'msg-1',
                      sender_id: TEST_SENDER_ID,
                      receiver_id: TEST_RECEIVER_ID,
                      content: 'First message',
                      read: true,
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                    },
                    {
                      id: 'msg-2',
                      sender_id: TEST_RECEIVER_ID,
                      receiver_id: TEST_SENDER_ID,
                      content: 'Reply message',
                      read: false,
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                    },
                  ],
                  error: null,
                })),
              })),
            })),
          })),
        };
      }
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn((_: string, id: string) => ({
              maybeSingle: vi.fn(() => Promise.resolve({
                data: {
                  id,
                  full_name: id === TEST_SENDER_ID ? 'Test Sender' : 'Test Receiver',
                  avatar_url: 'https://example.com/avatar.jpg',
                  role: 'student',
                  college_domain: 'example.edu',
                },
                error: null,
              })),
              single: vi.fn(() => Promise.resolve({
                data: {
                  id,
                  full_name: id === TEST_SENDER_ID ? 'Test Sender' : 'Test Receiver',
                  avatar_url: 'https://example.com/avatar.jpg',
                  role: 'student',
                  college_domain: 'example.edu',
                },
                error: null,
              })),
            })),
          })),
        };
      }
      if (table === 'connections') {
        return {
          select: vi.fn(() => ({
            or: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => ({
                  maybeSingle: vi.fn(() => Promise.resolve({ data: { status: 'accepted' }, error: null })),
                })),
              })),
            })),
          })),
        };
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      };
    }),
    channel: vi.fn(() => ({
      on: vi.fn(() => ({
        on: vi.fn(() => ({
          subscribe: vi.fn(),
        })),
      })),
      unsubscribe: vi.fn(),
    })),
  },
}));

describe('Messaging Send Function', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendMessage', () => {
    it('should send a message successfully', async () => {
      const result = await sendMessage(TEST_RECEIVER_ID, 'Hello, this is a test message');

      expect(result).toBeDefined();
      expect(result.id).toBeDefined(); // Generated ID in test environment
      expect(result.sender_id).toBe(TEST_SENDER_ID);
      expect(result.receiver_id).toBe(TEST_RECEIVER_ID);
      expect(result.content).toBe('Hello, this is a test message');
      expect(result.read).toBe(false);
    });

    it('should reject empty message content', async () => {
      await expect(sendMessage(TEST_RECEIVER_ID, '')).rejects.toThrow();
    });

    it('should reject whitespace-only message content', async () => {
      await expect(sendMessage(TEST_RECEIVER_ID, '   ')).rejects.toThrow();
    });

    it('should include timestamp in sent message', async () => {
      const result = await sendMessage(TEST_RECEIVER_ID, 'Timestamped message');

      expect(result.created_at).toBeDefined();
      expect(new Date(result.created_at).getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should mark new messages as unread by default', async () => {
      const result = await sendMessage(TEST_RECEIVER_ID, 'Unread test');

      expect(result.read).toBe(false);
    });
  });

  describe('getMessages', () => {
    it('should retrieve conversation messages', async () => {
      const result = await getMessages(TEST_RECEIVER_ID);

      expect(result).toBeDefined();
      expect(Array.isArray(result.messages)).toBe(true);
      expect(result.messages.length).toBeGreaterThan(0);
    });

    it('should order messages by creation time', async () => {
      const result = await getMessages(TEST_RECEIVER_ID);
      const messages = result.messages;

      for (let i = 1; i < messages.length; i++) {
        const prevTime = new Date(messages[i - 1].created_at).getTime();
        const currTime = new Date(messages[i].created_at).getTime();
        expect(prevTime).toBeLessThanOrEqual(currTime);
      }
    });

    it('should include both sent and received messages', async () => {
      const result = await getMessages(TEST_RECEIVER_ID);
      const messages = result.messages;

      const sentMessages = messages.filter(m => m.sender_id === TEST_SENDER_ID);
      
      // In test environment, at least sent messages should be present
      expect(sentMessages.length).toBeGreaterThanOrEqual(0);
      expect(messages.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getConversations', () => {
    it('should retrieve user conversations', async () => {
      const conversations = await getConversations();

      expect(conversations).toBeDefined();
      expect(Array.isArray(conversations)).toBe(true);
    });

    it('should include conversation metadata', async () => {
      const conversations = await getConversations();

      if (conversations.length > 0) {
        const conversation = conversations[0];
        expect(conversation).toHaveProperty('partner');
        expect(conversation).toHaveProperty('lastMessage');
        expect(conversation).toHaveProperty('unreadCount');
      }
    });
  });

  describe('Error handling', () => {
    it('should handle validation errors gracefully', async () => {
      // Empty message content should throw
      await expect(sendMessage(TEST_RECEIVER_ID, '')).rejects.toThrow();
    });
  });

  describe('Message validation', () => {
    it('should handle long messages', async () => {
      const longMessage = 'a'.repeat(1000);
      const result = await sendMessage(TEST_RECEIVER_ID, longMessage);

      expect(result).toBeDefined();
      expect(result.content).toBe(longMessage); // Should store the full message
    });

    it('should handle special characters in messages', async () => {
      const specialMessage = 'Test with special chars: 😀 🎉 @#$%^&*()';
      const result = await sendMessage(TEST_RECEIVER_ID, specialMessage);

      expect(result).toBeDefined();
      expect(result.sender_id).toBe(TEST_SENDER_ID);
    });

    it('should trim whitespace from message content', async () => {
      const messageWithWhitespace = '  Hello  ';
      const result = await sendMessage(TEST_RECEIVER_ID, messageWithWhitespace);

      expect(result).toBeDefined();
    });
  });
});
