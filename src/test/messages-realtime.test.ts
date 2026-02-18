import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getConversations,
  getMessages,
  getUnreadMessageCount,
  sendMessage,
  subscribeToMessages,
  markMessagesAsRead,
  updateLastSeen,
  isUserOnline,
} from "../lib/messages-api";

const USER_1 = "550e8400-e29b-41d4-a716-446655440000";
const USER_2 = "11111111-1111-1111-8111-111111111111";

type StoredMessage = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
  updated_at: string;
};

let currentUserId: string | null = USER_1;
let storedMessages: StoredMessage[] = [];
let profileLastSeen: Record<string, string | null> = {
  [USER_1]: null,
  [USER_2]: null,
};
let messageCounter = 0;

const nextMessageId = () => {
  messageCounter += 1;
  return `22222222-2222-2222-8222-${String(messageCounter).padStart(12, "0")}`;
};

type Listener = {
  filter: string;
  callback: (payload: { new?: { id?: string }; old?: { id?: string } }) => void;
};

const channels = new Set<{ listeners: Listener[] }>();

const emitChange = (row: StoredMessage) => {
  for (const channel of channels) {
    for (const listener of channel.listeners) {
      const [lhs, rhs] = listener.filter.split("=eq.");
      const column = lhs;
      const value = rhs;
      const match = (row as any)[column] === value;
      if (match) listener.callback({ new: { id: row.id } });
    }
  }
};

vi.mock("../integrations/supabase/client", () => {
  const from = (table: string) => {
    if (table === "messages") {
      const builder: any = {};
      let orFilter: string | null = null;
      let orderAscending = true;
      let orderColumn: string | null = null;
      let limitValue: number | null = null;
      let ltCreatedAt: string | null = null;
      const eqFilters: Record<string, string> = {};
      let wantsCount = false;
      let headOnly = false;

      builder.insert = (payload: any) => {
        return {
          select: () => ({
            single: async () => {
              const id = nextMessageId();
              const now = new Date().toISOString();
              const row: StoredMessage = {
                id,
                sender_id: payload.sender_id,
                receiver_id: payload.receiver_id,
                content: payload.content,
                read: Boolean(payload.read),
                created_at: now,
                updated_at: now,
              };
              storedMessages = [...storedMessages, row];
              emitChange(row);
              return { data: row, error: null };
            },
          }),
        };
      };

      builder.select = (_columns?: string, options?: { count?: string; head?: boolean }) => {
        wantsCount = Boolean(options?.count);
        headOnly = Boolean(options?.head);
        return builder;
      };
      builder.or = (filter: string) => {
        orFilter = filter;
        return builder;
      };
      builder.order = (col: string, opts?: { ascending?: boolean }) => {
        orderColumn = col;
        orderAscending = opts?.ascending ?? true;
        return builder;
      };
      builder.limit = (n: number) => {
        limitValue = n;
        return builder;
      };
      builder.lt = (col: string, value: string) => {
        if (col === "created_at") ltCreatedAt = value;
        return builder;
      };
      builder.eq = (col: string, value: string) => {
        eqFilters[col] = value;
        return builder;
      };
      builder.update = (patch: any) => {
        const updateFilters: Record<string, string> = {};
        const upd: any = {
          eq: (col: string, value: string) => {
            updateFilters[col] = value;
            return upd;
          },
          then: (resolve: (v: any) => void, reject: (e: any) => void) => {
            try {
              storedMessages = storedMessages.map((m) => {
                const matches = Object.entries(updateFilters).every(
                  ([k, v]) => (m as any)[k] === v
                );
                if (!matches) return m;
                const updated = {
                  ...m,
                  ...patch,
                  updated_at: new Date().toISOString(),
                };
                emitChange(updated);
                return updated;
              });
              resolve({ error: null });
            } catch (e) {
              reject(e);
            }
          },
        };
        return upd;
      };
      builder.maybeSingle = async () => {
        const data = builder._executeSelect()[0] ?? null;
        return { data, error: null };
      };
      builder.single = async () => {
        const data = builder._executeSelect()[0] ?? null;
        return { data, error: null };
      };

      builder._executeSelect = () => {
        let out = [...storedMessages];

        if (orFilter) {
          // Handle the two-way conversation filter used in getMessages.
          const match = /sender_id\.eq\.([^,]+),receiver_id\.eq\.([^)]+)\)/g;
          const pairs: Array<[string, string]> = [];
          let m: RegExpExecArray | null;
          while ((m = match.exec(orFilter)) !== null) {
            pairs.push([m[1], m[2]]);
          }

          if (pairs.length >= 2) {
            const [a1, b1] = pairs[0];
            const [a2, b2] = pairs[1];
            out = out.filter(
              (row) =>
                (row.sender_id === a1 && row.receiver_id === b1) ||
                (row.sender_id === a2 && row.receiver_id === b2)
            );
          } else {
            // Fallback for generic inbox queries.
            out = out.filter(
              (row) => row.sender_id === currentUserId || row.receiver_id === currentUserId
            );
          }
        }

        for (const [k, v] of Object.entries(eqFilters)) {
          out = out.filter((row) => (row as any)[k] === v);
        }

        if (ltCreatedAt) {
          out = out.filter((row) => new Date(row.created_at) < new Date(ltCreatedAt as string));
        }

        if (orderColumn === "created_at") {
          out.sort((a, b) => {
            const cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            return orderAscending ? cmp : -cmp;
          });
        }

        if (limitValue != null) {
          out = out.slice(0, limitValue);
        }

        return out;
      };

      builder.then = (resolve: (v: any) => void, reject: (e: any) => void) => {
        try {
          const data = headOnly ? null : builder._executeSelect();
          const count = wantsCount ? builder._executeSelect().length : null;
          resolve({ data, count, error: null });
        } catch (e) {
          reject(e);
        }
      };

      return builder;
    }

    if (table === "profiles") {
      const builder: any = {};
      builder.select = () => {
        const selectBuilder: any = {};
        selectBuilder.eq = (_col: string, value: string) => {
          selectBuilder._eqValue = value;
          return selectBuilder;
        };
        selectBuilder.maybeSingle = async () => {
          const id = selectBuilder._eqValue;
          const name = id === USER_1 ? "User 1" : "User 2";
          return {
            data: {
              id,
              full_name: name,
              avatar_url: "",
              last_seen: profileLastSeen[id] ?? null,
              college_domain: "example.edu",
            },
            error: null,
          };
        };
        return selectBuilder;
      };
      builder.update = (patch: any) => {
        return {
          eq: async (col: string, value: string) => {
            if (col === "id") {
              profileLastSeen = { ...profileLastSeen, [value]: patch.last_seen };
            }
            return { error: null };
          },
        };
      };
      return builder;
    }

    if (table === "connections") {
      const builder: any = {};
      builder.select = () => builder;
      builder.or = () => builder;
      builder.order = () => builder;
      builder.limit = () => builder;
      builder.maybeSingle = async () => ({ data: { status: "accepted" }, error: null });
      return builder;
    }

    return {};
  };

  const rpc = async (fn: string, args: any) => {
    if (fn === "get_unread_message_count") {
      const target = args?.p_user_id;
      const count = storedMessages.filter(
        (m) => m.receiver_id === target && m.receiver_id === currentUserId && !m.read
      ).length;
      return { data: count, error: null };
    }

    if (fn === "get_conversations") {
      const target = args?.p_user_id;
      if (target !== currentUserId) return { data: [], error: null };

      const byPartner = new Map<string, StoredMessage[]>();
      for (const msg of storedMessages) {
        if (msg.sender_id !== target && msg.receiver_id !== target) continue;
        const partnerId = msg.sender_id === target ? msg.receiver_id : msg.sender_id;
        byPartner.set(partnerId, [...(byPartner.get(partnerId) ?? []), msg]);
      }

      const rows = Array.from(byPartner.entries()).map(([partnerId, msgs]) => {
        msgs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const last = msgs[0];
        const unread = msgs.filter((m) => m.receiver_id === target && !m.read).length;
        return {
          partner_id: partnerId,
          partner_full_name: partnerId === USER_1 ? "User 1" : "User 2",
          partner_avatar_url: "",
          partner_last_seen: profileLastSeen[partnerId] ?? null,
          last_message_id: last.id,
          last_message_sender_id: last.sender_id,
          last_message_receiver_id: last.receiver_id,
          last_message_content: last.content,
          last_message_read: last.read,
          last_message_created_at: last.created_at,
          last_message_updated_at: last.updated_at,
          unread_count: unread,
        };
      });

      rows.sort(
        (a, b) =>
          new Date(b.last_message_created_at).getTime() -
          new Date(a.last_message_created_at).getTime()
      );

      return { data: rows, error: null };
    }

    return { data: null, error: { code: "42883" } };
  };

  const channel = () => {
    const ch = { listeners: [] as Listener[] };
    const api: any = {
      on: (_type: string, cfg: { filter: string }, cb: Listener["callback"]) => {
        ch.listeners.push({ filter: cfg.filter, callback: cb });
        return api;
      },
      subscribe: () => {
        channels.add(ch);
        return api;
      },
      _internal: ch,
    };
    return api;
  };

  const removeChannel = (ch: any) => {
    if (ch?._internal) channels.delete(ch._internal);
  };

  return {
    supabase: {
      auth: {
        getUser: vi.fn(async () => ({ data: { user: currentUserId ? { id: currentUserId } : null }, error: null })),
      },
      from: vi.fn(from),
      rpc: vi.fn(rpc),
      channel: vi.fn(channel),
      removeChannel: vi.fn(removeChannel),
    },
  };
});

describe("Realtime Messaging - Service Contract", () => {
  beforeEach(() => {
    currentUserId = USER_1;
    storedMessages = [];
    profileLastSeen = { [USER_1]: null, [USER_2]: null };
    messageCounter = 0;
  });

  it("persists messages and retrieves them by conversation", async () => {
    await sendMessage(USER_2, "Hello");

    const result = await getMessages(USER_2, 10);
    expect(result.messages.length).toBe(1);
    expect(result.messages[0].sender_id).toBe(USER_1);
    expect(result.messages[0].receiver_id).toBe(USER_2);
    expect(result.messages[0].content).toBe("Hello");
  });

  it("returns conversations with unread counts via RPC", async () => {
    // USER_1 sends to USER_2
    await sendMessage(USER_2, "Ping");

    // Switch to USER_2 to see unread
    currentUserId = USER_2;

    const unread = await getUnreadMessageCount();
    expect(unread).toBe(1);

    const conversations = await getConversations(USER_2);
    expect(conversations.length).toBe(1);
    expect(conversations[0].partner.id).toBe(USER_1);
    expect(conversations[0].unreadCount).toBe(1);
  });

  it("marks messages as read and updates unread counts", async () => {
    currentUserId = USER_1;
    await sendMessage(USER_2, "Unread me");

    currentUserId = USER_2;
    expect(await getUnreadMessageCount()).toBe(1);

    await markMessagesAsRead(USER_1);
    expect(await getUnreadMessageCount()).toBe(0);
  });

  it("delivers realtime events to subscribers", async () => {
    currentUserId = USER_2;
    const received: string[] = [];
    const unsubscribe = subscribeToMessages(USER_2, (msg) => received.push(msg.content));

    currentUserId = USER_1;
    await sendMessage(USER_2, "Realtime!");

    await new Promise((r) => setTimeout(r, 0));
    expect(received).toContain("Realtime!");

    unsubscribe();
  });

  it("updates last_seen and evaluates online status", async () => {
    currentUserId = USER_1;
    await updateLastSeen(USER_1);

    const recent = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const old = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    expect(isUserOnline(recent)).toBe(true);
    expect(isUserOnline(old)).toBe(false);
  });

  it("hard-fails on invalid UUIDs", async () => {
    await expect(getMessages("not-a-uuid", 10)).rejects.toThrow();
    await expect(sendMessage("not-a-uuid", "hi")).rejects.toThrow();
  });

  it("hard-fails when unauthenticated", async () => {
    currentUserId = null;
    await expect(getConversations()).rejects.toThrow("Failed to load conversations");
  });
});
