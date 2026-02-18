
import { supabase } from "@/integrations/supabase/client";
import { handleApiError } from "@/lib/errorHandler";
import { assertValidUuid } from "@/lib/uuid";
import type { Database } from "@/integrations/supabase/types";

type SharedItemInsert = Database["public"]["Tables"]["shared_items"]["Insert"];
type ItemRequestInsert = Database["public"]["Tables"]["item_requests"]["Insert"];

const SHARED_ITEMS_IMAGE_BUCKET = "shared-items";

type RequesterProfile = { id: string; full_name: string | null; avatar_url: string | null };

type CurrentUserContext = {
  userId: string;
  collegeDomain: string;
  role: string;
};

export type SharedItemIntent = {
  id: string;
  item_id: string;
  requester_id: string;
  seller_id: string;
  intent_type: 'contact' | 'buy' | 'rent';
  status: 'sent' | 'cancelled';
  created_at?: string;
};

export type ItemRequestResponse = {
  id: string;
  request_id: string;
  responder_id: string;
  requester_id: string;
  status: 'sent' | 'cancelled';
  created_at?: string;
};

// Types for EcoCampus data
export type SharedItem = {
  id: string;
  title: string;
  description: string;
  price: string;
  share_type: 'donate' | 'sell' | 'rent';
  rent_unit?: 'day' | 'week' | 'month';
  category: string;
  image?: string;
  location?: string;
  user_id: string;
  status: 'available' | 'taken' | 'pending';
  created_at?: string;
  seller?: {
    id: string;
    name: string;
    avatar: string;
  };
};

export type ItemRequest = {
  id: string;
  item: string;
  description: string;
  urgency: string;
  preference: string;
  user_id: string;
  status?: 'open' | 'fulfilled' | 'cancelled';
  created_at?: string;
  requester?: {
    id: string;
    name: string;
    avatar: string;
  };
};

const isUniqueViolation = (error: unknown) => (error as { code?: string } | null)?.code === '23505';

const mapToSharedItem = (item: Record<string, unknown>, seller?: RequesterProfile | null): SharedItem => {
  const id = String(item.id || '');
  const userId = String(item.user_id || '');
  assertValidUuid(id, 'sharedItemId');
  assertValidUuid(userId, 'sellerId');

  const rawPrice = String(item.price ?? '').trim();
  const shareType = (item.share_type as SharedItem['share_type'] | null) ||
    (rawPrice === '' || rawPrice.toLowerCase() === 'free' ? 'donate' : 'sell');
  const rentUnit = (item.rent_unit as SharedItem['rent_unit'] | null) || undefined;

  const resolvedSeller = seller ?? (item.seller as RequesterProfile | null | undefined) ?? null;
  if (resolvedSeller?.id) {
    assertValidUuid(resolvedSeller.id, 'sellerId');
  }

  return {
    id,
    title: (item.title as string) || '',
    description: (item.description as string) || '',
    price: rawPrice,
    share_type: shareType,
    rent_unit: rentUnit,
    category: (item.category as string) || '',
    image: (item.image as string) || undefined,
    location: (item.location as string) || undefined,
    user_id: userId,
    status: (item.status as 'available' | 'taken' | 'pending') || 'available',
    created_at: item.created_at as string,
    seller: resolvedSeller
      ? {
          id: resolvedSeller.id,
          name: resolvedSeller.full_name?.trim() || 'Unknown user',
          avatar: resolvedSeller.avatar_url || '',
        }
      : {
          id: userId,
          name: 'Unknown user',
          avatar: '',
        },
  };
};

// Helper function to map database response to ItemRequest type
const mapToItemRequest = (request: Record<string, unknown>, requester?: RequesterProfile | null): ItemRequest => {
  const id = String(request.id || '');
  const userId = String(request.user_id || '');
  assertValidUuid(id, 'itemRequestId');
  assertValidUuid(userId, 'requesterId');

  const resolvedRequester = requester ?? (request.requester as RequesterProfile | null | undefined) ?? null;
  if (resolvedRequester?.id) {
    assertValidUuid(resolvedRequester.id, 'requesterId');
  }

  return {
    id,
    item: (request.item as string) || '',
    description: (request.description as string) || '',
    urgency: (request.urgency as string) || '',
    preference: (request.preference as string) || '',
    user_id: userId,
    status: (request.status as ItemRequest['status']) || 'open',
    created_at: request.created_at as string,
    requester: resolvedRequester
      ? {
          id: resolvedRequester.id,
          name: resolvedRequester.full_name?.trim() || 'Unknown user',
          avatar: resolvedRequester.avatar_url || '',
        }
      : {
          id: userId,
          name: 'Unknown user',
          avatar: '',
        },
  };
};

const fetchProfilesByIds = async (userIds: string[]): Promise<Record<string, RequesterProfile>> => {
  const uniqueIds = Array.from(new Set(userIds)).filter(Boolean);
  uniqueIds.forEach((id) => assertValidUuid(id, 'userId'));
  if (uniqueIds.length === 0) return {};

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', uniqueIds);

  if (error) throw error;

  return (data || []).reduce<Record<string, RequesterProfile>>((acc, profile) => {
    acc[profile.id] = profile as RequesterProfile;
    return acc;
  }, {});
};

const getCurrentUserContext = async (): Promise<CurrentUserContext> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('User not authenticated');
  }
  assertValidUuid(session.user.id, 'userId');

  const { data, error } = await supabase
    .from('profiles')
    .select('college_domain, role')
    .eq('id', session.user.id)
    .single();

  if (error) throw error;

  const collegeDomain = (data?.college_domain || '').toString().trim().toLowerCase();
  if (!collegeDomain) {
    throw new Error('Your profile is missing a college domain. Please complete onboarding.');
  }

  return {
    userId: session.user.id,
    collegeDomain,
    role: (data?.role || '').toString().toLowerCase(),
  };
};

const assertCurrentUserCanMutate = async (): Promise<CurrentUserContext> => {
  const context = await getCurrentUserContext();
  if (context.role === 'manager') {
    throw new Error('Managers can only review and approve items.');
  }
  return context;
};

export const uploadSharedItemImage = async (imageFile: File): Promise<string> => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!user?.id) throw new Error('User not authenticated');

    if (!imageFile.type.startsWith('image/')) {
      throw new Error('Only image files are supported');
    }

    if (imageFile.size > 5 * 1024 * 1024) {
      throw new Error('Image size must be less than 5MB');
    }

    const fileExt = imageFile.name.split('.').pop() || 'jpg';
    const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const fileName = `${random}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(SHARED_ITEMS_IMAGE_BUCKET)
      .upload(filePath, imageFile, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from(SHARED_ITEMS_IMAGE_BUCKET).getPublicUrl(filePath);

    if (!publicUrl) throw new Error('Failed to resolve uploaded image URL');

    return publicUrl;
  } catch (error) {
    throw handleApiError(error, {
      operation: 'uploadSharedItemImage',
      userMessage: 'Failed to upload image. Please try again.',
    });
  }
};

/**
 * Fetches all available shared items
 * NOTE: Public endpoint - no authentication required (RLS policy allows SELECT for all)
 */
export const fetchSharedItems = async (): Promise<SharedItem[]> => {
  try {
    const { collegeDomain } = await getCurrentUserContext();

    const { data, error } = await supabase
      .from('shared_items')
      .select('*')
      .eq('college_domain', collegeDomain)
      .eq('status', 'available')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    const rows = (data || []) as Record<string, unknown>[];
    const profileMap = await fetchProfilesByIds(rows.map((item) => String(item.user_id || '')));
    return rows.map((item) => mapToSharedItem(item, profileMap[String(item.user_id || '')] ?? null));
  } catch (error) {
    throw handleApiError(error, {
      operation: 'fetchSharedItems',
      userMessage: 'Failed to load shared items. Please try again.',
    });
  }
};

/**
 * Fetches all item requests
 * NOTE: Public endpoint - no authentication required (RLS policy allows SELECT for all)
 */
export const fetchRequests = async (): Promise<ItemRequest[]> => {
  try {
    const { collegeDomain } = await getCurrentUserContext();

    const { data, error } = await supabase
      .from('item_requests')
      .select('*')
      .eq('college_domain', collegeDomain)
      .eq('status', 'open')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    const rows = (data || []) as Record<string, unknown>[];
    const profileMap = await fetchProfilesByIds(rows.map((item) => String(item.user_id || '')));
    return rows.map((item) => mapToItemRequest(item, profileMap[String(item.user_id || '')] ?? null));
  } catch (error) {
    throw handleApiError(error, {
      operation: 'fetchRequests',
      userMessage: 'Failed to load item requests. Please try again.',
    });
  }
};

/**
 * Fetches user's own shared items
 */
export const fetchMySharedItems = async (): Promise<SharedItem[]> => {
  try {
    const { userId } = await getCurrentUserContext();

    const { data, error } = await supabase
      .from('shared_items')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    const rows = (data || []) as Record<string, unknown>[];
    const profileMap = await fetchProfilesByIds([userId]);
    return rows.map((item) => mapToSharedItem(item, profileMap[userId] ?? null));
  } catch (error) {
    throw handleApiError(error, {
      operation: 'fetchMySharedItems',
      userMessage: 'Failed to load your shared items. Please try again.',
    });
  }
};

/**
 * Fetches user's own requests
 */
export const fetchMyRequests = async (): Promise<ItemRequest[]> => {
  try {
    const { userId } = await getCurrentUserContext();

    const { data, error } = await supabase
      .from('item_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    const rows = (data || []) as Record<string, unknown>[];
    const profileMap = await fetchProfilesByIds([userId]);
    return rows.map((item) => mapToItemRequest(item, profileMap[userId] ?? null));
  } catch (error) {
    throw handleApiError(error, {
      operation: 'fetchMyRequests',
      userMessage: 'Failed to load your requests. Please try again.',
    });
  }
};

/**
 * Creates a new shared item
 */
export const createSharedItem = async (item: Omit<SharedItem, 'id' | 'user_id' | 'created_at' | 'status'>) => {
  try {
    const { userId, collegeDomain } = await assertCurrentUserCanMutate();

    const insertData: SharedItemInsert = {
      title: item.title,
      description: item.description,
      price: item.price,
      category: item.category,
      image: item.image ?? null,
      location: item.location ?? null,
      share_type: item.share_type,
      rent_unit: item.rent_unit ?? null,
      user_id: userId,
      status: 'available',
      college_domain: collegeDomain,
    };

    const { data, error } = await supabase
      .from('shared_items')
      .insert(insertData)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return mapToSharedItem(data as unknown as Record<string, unknown>);
  } catch (error) {
    throw handleApiError(error, {
      operation: 'createSharedItem',
      userMessage: 'Failed to create shared item. Please try again.',
    });
  }
};

/**
 * Creates a new item request
 */
export const createItemRequest = async (request: Omit<ItemRequest, 'id' | 'user_id' | 'created_at'>) => {
  try {
    const { userId, collegeDomain } = await assertCurrentUserCanMutate();

    const insertData: ItemRequestInsert = {
      item: request.item,
      description: request.description,
      urgency: request.urgency,
      preference: request.preference,
      user_id: userId,
      college_domain: collegeDomain,
      status: 'open',
    };

    const { data, error } = await supabase
      .from('item_requests')
      .insert(insertData)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return mapToItemRequest(data as unknown as Record<string, unknown>);
  } catch (error) {
    throw handleApiError(error, {
      operation: 'createItemRequest',
      userMessage: 'Failed to create item request. Please try again.',
    });
  }
};

/**
 * Updates a shared item's status
 */
export const updateSharedItemStatus = async (id: string, status: 'available' | 'taken') => {
  try {
    assertValidUuid(id, 'sharedItemId');
    const { userId } = await assertCurrentUserCanMutate();


    const { data, error } = await supabase
      .from('shared_items')
      .update({ status })
      .eq('id', id)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return mapToSharedItem(data as unknown as Record<string, unknown>);
  } catch (error) {
    throw handleApiError(error, {
      operation: 'updateSharedItemStatus',
      userMessage: 'Failed to update item status. Please try again.',
    });
  }
};

/**
 * Deletes a shared item
 */
export const deleteSharedItem = async (id: string) => {
  try {
    assertValidUuid(id, 'sharedItemId');
    const { userId } = await assertCurrentUserCanMutate();


    const { error } = await supabase
      .from('shared_items')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    throw handleApiError(error, {
      operation: 'deleteSharedItem',
      userMessage: 'Failed to delete shared item. Please try again.',
    });
  }
};

/**
 * Deletes an item request
 */
export const deleteItemRequest = async (id: string) => {
  try {
    assertValidUuid(id, 'itemRequestId');
    const { userId } = await assertCurrentUserCanMutate();


    const { error } = await supabase
      .from('item_requests')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    throw handleApiError(error, {
      operation: 'deleteItemRequest',
      userMessage: 'Failed to delete item request. Please try again.',
    });
  }
};

/**
 * Updates shared item details (owner-only)
 */
export const updateSharedItemDetails = async (
  id: string,
  updates: Partial<Pick<SharedItem, 'title' | 'description' | 'price' | 'category' | 'location' | 'image' | 'status' | 'share_type' | 'rent_unit'>>
) => {
  try {
    assertValidUuid(id, 'sharedItemId');
    const { userId } = await assertCurrentUserCanMutate();

    const { data, error } = await supabase
      .from('shared_items')
      .update({ ...updates })
      .eq('id', id)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return mapToSharedItem(data as Record<string, unknown>);
  } catch (error) {
    throw handleApiError(error, {
      operation: 'updateSharedItemDetails',
      userMessage: 'Failed to update shared item. Please try again.',
    });
  }
};

/**
 * Updates item request details (owner-only)
 */
export const updateItemRequest = async (
  id: string,
  updates: Partial<Pick<ItemRequest, 'item' | 'description' | 'urgency' | 'preference'>>
) => {
  try {
    assertValidUuid(id, 'itemRequestId');
    const { userId } = await assertCurrentUserCanMutate();

    const { data, error } = await supabase
      .from('item_requests')
      .update({ ...updates })
      .eq('id', id)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return mapToItemRequest(data as Record<string, unknown>);
  } catch (error) {
    throw handleApiError(error, {
      operation: 'updateItemRequest',
      userMessage: 'Failed to update item request. Please try again.',
    });
  }
};

/**
 * Fetches current user's shared item intents (contact/buy/rent)
 */
export const fetchSharedItemIntents = async (): Promise<SharedItemIntent[]> => {
  try {
    const { userId } = await getCurrentUserContext();

    const { data, error } = await supabase
      .from('shared_item_intents')
      .select('*')
      .eq('requester_id', userId);

    if (error) throw error;
    return (data || []).map((row) => {
      const intent = row as SharedItemIntent;
      assertValidUuid(intent.id, 'intentId');
      assertValidUuid(intent.item_id, 'itemId');
      assertValidUuid(intent.requester_id, 'requesterId');
      assertValidUuid(intent.seller_id, 'sellerId');
      return intent;
    });
  } catch (error) {
    throw handleApiError(error, {
      operation: 'fetchSharedItemIntents',
      userMessage: 'Failed to load your item requests. Please try again.',
    });
  }
};

/**
 * Creates a shared item intent (contact, buy, or rent)
 */
export const createSharedItemIntent = async (
  itemId: string,
  sellerId: string,
  intentType: SharedItemIntent['intent_type']
): Promise<SharedItemIntent> => {
  try {
    assertValidUuid(itemId, 'itemId');
    assertValidUuid(sellerId, 'sellerId');
    const { userId, collegeDomain } = await assertCurrentUserCanMutate();

    if (userId === sellerId) {
      throw new Error('You cannot contact your own listing');
    }

    const { data: itemRow, error: itemError } = await supabase
      .from('shared_items')
      .select('id, user_id, college_domain, status')
      .eq('id', itemId)
      .maybeSingle();

    if (itemError) throw itemError;
    if (!itemRow) throw new Error('Listing not found or not accessible');
    if (itemRow.user_id !== sellerId) throw new Error('Listing seller mismatch');
    if (itemRow.status !== 'available') throw new Error('This listing is no longer available');

    const itemCollegeDomain = (itemRow.college_domain || '').toString().trim().toLowerCase();
    if (!itemCollegeDomain || itemCollegeDomain !== collegeDomain) {
      throw new Error('This listing is outside your college community');
    }

    const { data, error } = await supabase
      .from('shared_item_intents')
      .insert({
        item_id: itemId,
        requester_id: userId,
        seller_id: sellerId,
        intent_type: intentType,
        status: 'sent',
      })
      .select('*')
      .single();

    if (error) {
      if (isUniqueViolation(error)) {
        throw new Error('Request already sent for this item');
      }
      throw error;
    }

    return data as SharedItemIntent;
  } catch (error) {
    throw handleApiError(error, {
      operation: 'createSharedItemIntent',
      userMessage: 'Failed to send request. Please try again.',
    });
  }
};

export const deleteSharedItemIntent = async (intentId: string) => {
  try {
    assertValidUuid(intentId, 'intentId');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('User not authenticated');
    assertValidUuid(session.user.id, 'userId');

    const { error } = await supabase
      .from('shared_item_intents')
      .delete()
      .eq('id', intentId)
      .eq('requester_id', session.user.id);

    if (error) throw error;
    return true;
  } catch (error) {
    throw handleApiError(error, {
      operation: 'deleteSharedItemIntent',
      userMessage: 'Failed to rollback request. Please try again.',
    });
  }
};

/**
 * Fetches current user's responses to item requests
 */
export const fetchItemRequestResponses = async (): Promise<ItemRequestResponse[]> => {
  try {
    const { userId } = await getCurrentUserContext();

    const { data, error } = await supabase
      .from('item_request_responses')
      .select('*')
      .eq('responder_id', userId);

    if (error) throw error;
    return (data || []).map((row) => {
      const response = row as ItemRequestResponse;
      assertValidUuid(response.id, 'responseId');
      assertValidUuid(response.request_id, 'requestId');
      assertValidUuid(response.responder_id, 'responderId');
      assertValidUuid(response.requester_id, 'requesterId');
      return response;
    });
  } catch (error) {
    throw handleApiError(error, {
      operation: 'fetchItemRequestResponses',
      userMessage: 'Failed to load your responses. Please try again.',
    });
  }
};

/**
 * Creates a response to an item request
 */
export const createItemRequestResponse = async (
  requestId: string,
  requesterId: string
): Promise<ItemRequestResponse> => {
  try {
    assertValidUuid(requestId, 'requestId');
    assertValidUuid(requesterId, 'requesterId');
    const { userId, collegeDomain } = await assertCurrentUserCanMutate();

    if (userId === requesterId) {
      throw new Error('You cannot respond to your own request');
    }

    const { data: requestRow, error: requestError } = await supabase
      .from('item_requests')
      .select('id, user_id, college_domain, status')
      .eq('id', requestId)
      .maybeSingle();

    if (requestError) throw requestError;
    if (!requestRow) throw new Error('Request not found or not accessible');
    if (requestRow.user_id !== requesterId) throw new Error('Request owner mismatch');
    if (requestRow.status !== 'open') throw new Error('This request is no longer open');

    const requestCollegeDomain = (requestRow.college_domain || '').toString().trim().toLowerCase();
    if (!requestCollegeDomain || requestCollegeDomain !== collegeDomain) {
      throw new Error('This request is outside your college community');
    }

    const { data, error } = await supabase
      .from('item_request_responses')
      .insert({
        request_id: requestId,
        responder_id: userId,
        requester_id: requesterId,
        status: 'sent',
      })
      .select('*')
      .single();

    if (error) {
      if (isUniqueViolation(error)) {
        throw new Error('Response already sent for this request');
      }
      throw error;
    }

    return data as ItemRequestResponse;
  } catch (error) {
    throw handleApiError(error, {
      operation: 'createItemRequestResponse',
      userMessage: 'Failed to respond to request. Please try again.',
    });
  }
};

export const deleteItemRequestResponse = async (responseId: string) => {
  try {
    assertValidUuid(responseId, 'responseId');
    const { userId } = await assertCurrentUserCanMutate();

    const { error } = await supabase
      .from('item_request_responses')
      .delete()
      .eq('id', responseId)
      .eq('responder_id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    throw handleApiError(error, {
      operation: 'deleteItemRequestResponse',
      userMessage: 'Failed to rollback response. Please try again.',
    });
  }
};

/**
 * Sends a marketplace message to another user within the same college community.
 * Bypasses the connection gate enforced by messages-api.sendMessage because
 * EcoCampus transactions should allow messaging between any same-college users.
 * RLS on the messages table already enforces same-college domain checks.
 */
export const sendEcoCampusMessage = async (
  receiverId: string,
  content: string
): Promise<void> => {
  try {
    assertValidUuid(receiverId, 'receiverId');
    const { userId, collegeDomain } = await getCurrentUserContext();

    if (userId === receiverId) {
      throw new Error('You cannot message yourself.');
    }

    if (!content.trim()) {
      throw new Error('Message content cannot be empty.');
    }

    // Verify receiver exists and is in the same college community
    const { data: receiverProfile, error: receiverError } = await supabase
      .from('profiles')
      .select('college_domain')
      .eq('id', receiverId)
      .maybeSingle();

    if (receiverError) throw receiverError;
    if (!receiverProfile) {
      throw new Error('Recipient not found.');
    }

    const receiverDomain = (receiverProfile.college_domain || '').toString().trim().toLowerCase();
    if (!receiverDomain || receiverDomain !== collegeDomain) {
      throw new Error('You can only message users from your own college community.');
    }

    // Insert directly — RLS enforces sender_id = auth.uid() + same college domain
    const { error: insertError } = await supabase
      .from('messages')
      .insert({
        sender_id: userId,
        receiver_id: receiverId,
        college_domain: collegeDomain,
        content: content.trim(),
        read: false,
      });

    if (insertError) throw insertError;
  } catch (error) {
    throw handleApiError(error, {
      operation: 'sendEcoCampusMessage',
      userMessage: 'Failed to send message. Please try again.',
    });
  }
};
