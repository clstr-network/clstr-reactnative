import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getSavedItems, toggleSaveItem, removeSavedItem, checkIfItemSaved } from '@/lib/saved-api';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}));

describe('Saved Items API', () => {
  const mockUserId = '550e8400-e29b-41d4-a716-446655440000';
  const mockProfileId = '550e8400-e29b-41d4-a716-446655440000';
  const mockCollegeDomain = 'university.edu';
  const mockPostId = '11111111-1111-1111-8111-111111111111';
  const mockProjectId = '22222222-2222-2222-8222-222222222222';
  const mockClubId = '33333333-3333-3333-8333-333333333333';
  const mockSavedItemId = '44444444-4444-4444-8444-444444444444';

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock authenticated user
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getSavedItems', () => {
    it('should retrieve saved items grouped by type', async () => {
      // Mock profile query
      const mockFrom = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: { college_domain: mockCollegeDomain },
        error: null,
      });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: mockSelect.mockReturnValue({
              eq: mockEq.mockReturnValue({
                single: mockSingle,
              }),
            }),
          };
        }
        if (table === 'saved_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [
                    { id: 'saved-1', user_id: mockUserId, type: 'post', item_id: mockPostId, created_at: '2024-01-01' },
                    { id: 'saved-2', user_id: mockUserId, type: 'project', item_id: mockProjectId, created_at: '2024-01-02' },
                    { id: 'saved-3', user_id: mockUserId, type: 'club', item_id: mockClubId, created_at: '2024-01-03' },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'posts') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                or: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: mockPostId,
                      content: 'Test post',
                      college_domain: mockCollegeDomain,
                      user: { id: 'user-1', full_name: 'Test User', avatar_url: null, role: 'Student', domain: 'university.edu' },
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'collab_projects') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({
                    data: [
                      {
                        id: mockProjectId,
                        title: 'Test Project',
                        college_domain: mockCollegeDomain,
                        visibility: 'public',
                      },
                    ],
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'clubs') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({
                    data: [
                      {
                        id: mockClubId,
                        name: 'Test Club',
                        college_domain: mockCollegeDomain,
                        is_active: true,
                      },
                    ],
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'post_likes') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                in: vi.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          };
        }
        return mockFrom;
      });

      const result = await getSavedItems(mockProfileId);

      expect(result.error).toBeNull();
      expect(result.posts).toHaveLength(1);
      expect(result.projects).toHaveLength(1);
      expect(result.clubs).toHaveLength(1);
      expect(result.posts[0].id).toBe(mockPostId);
      expect(result.projects[0].id).toBe(mockProjectId);
      expect(result.clubs[0].id).toBe(mockClubId);
    });

    it('should enforce domain isolation for posts', async () => {
      const otherDomain = 'other-university.edu';

      // Mock profile with specific domain
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { college_domain: mockCollegeDomain },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'saved_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [
                    { id: 'saved-1', user_id: mockUserId, type: 'post', item_id: mockPostId, created_at: '2024-01-01' },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'posts') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: mockPostId,
                    content: 'Test post from other domain',
                    college_domain: otherDomain, // Different domain
                    user: { id: 'user-1', full_name: 'Test User', avatar_url: null, role: 'Student', domain: otherDomain },
                  },
                ],
                error: null,
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      const result = await getSavedItems(mockProfileId);

      // Post from different domain should be filtered out
      expect(result.posts).toHaveLength(0);
    });

    it('should return error when user is not authenticated', async () => {
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await getSavedItems(mockProfileId);

      expect(result.error).toBe('Not authenticated');
      expect(result.posts).toHaveLength(0);
      expect(result.projects).toHaveLength(0);
      expect(result.clubs).toHaveLength(0);
    });

    it('should return error when accessing another user\'s saved items', async () => {
      const result = await getSavedItems('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

      expect(result.error).toBe('Unauthorized: Can only view your own saved items');
    });
  });

  describe('toggleSaveItem', () => {
    it('should save an item when not already saved', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { college_domain: mockCollegeDomain },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'posts') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: mockPostId, college_domain: mockCollegeDomain },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'saved_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: null, // Not saved yet
                error: null,
              }),
            }),
            insert: mockInsert,
          };
        }
        return { select: vi.fn() };
      });

      const result = await toggleSaveItem(mockProfileId, 'post', mockPostId);

      expect(result.saved).toBe(true);
      expect(result.error).toBeNull();
      expect(mockInsert).toHaveBeenCalledWith({
        user_id: mockUserId,
        type: 'post',
        item_id: mockPostId,
      });
    });

    it('should unsave an item when already saved', async () => {
      const mockDelete = vi.fn().mockResolvedValue({ error: null });
      
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { college_domain: mockCollegeDomain },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'posts') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: mockPostId, college_domain: mockCollegeDomain },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'saved_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: 'saved-1' }, // Already saved
                error: null,
              }),
            }),
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue(mockDelete()),
            }),
          };
        }
        return { select: vi.fn() };
      });

      const result = await toggleSaveItem(mockProfileId, 'post', mockPostId);

      expect(result.saved).toBe(false);
      expect(result.error).toBeNull();
    });

    it('should enforce domain isolation when saving projects', async () => {
      const otherDomain = 'other-university.edu';
      
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { college_domain: mockCollegeDomain },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'collab_projects') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { 
                    id: mockProjectId, 
                    college_domain: otherDomain, // Different domain
                    visibility: 'public',
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      const result = await toggleSaveItem(mockProfileId, 'project', mockProjectId);

      expect(result.saved).toBe(false);
      expect(result.error).toBe('Item not found or not accessible');
    });

    it('should not allow saving private projects', async () => {
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { college_domain: mockCollegeDomain },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'collab_projects') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { 
                    id: mockProjectId, 
                    college_domain: mockCollegeDomain,
                    visibility: 'private', // Private project
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      const result = await toggleSaveItem(mockProfileId, 'project', mockProjectId);

      expect(result.saved).toBe(false);
      expect(result.error).toBe('Item not found or not accessible');
    });
  });

  describe('removeSavedItem', () => {
    it('should remove a saved item by its ID', async () => {
      const savedItemId = mockSavedItemId;
      const mockDelete = vi.fn().mockResolvedValue({ error: null });
      
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'saved_items') {
          return {
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
            }),
          };
        }
        return { delete: vi.fn() };
      });

      const result = await removeSavedItem(mockProfileId, savedItemId);

      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should return error when user is not authenticated', async () => {
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await removeSavedItem(mockProfileId, mockSavedItemId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not authenticated');
    });
  });

  describe('checkIfItemSaved', () => {
    it('should return true when item is saved', async () => {
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'saved_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: 'saved-1' },
                error: null,
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      const result = await checkIfItemSaved('post', mockPostId);

      expect(result).toBe(true);
    });

    it('should return false when item is not saved', async () => {
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'saved_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      const result = await checkIfItemSaved('post', mockPostId);

      expect(result).toBe(false);
    });

    it('should return false when user is not authenticated', async () => {
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await checkIfItemSaved('post', mockPostId);

      expect(result).toBe(false);
    });
  });
});
