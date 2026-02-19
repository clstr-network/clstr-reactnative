
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CHANNELS } from '@clstr/shared/realtime/channels';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Grid2X2, List, MessageSquare, ShoppingCart, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import {
  createSharedItemIntent,
  deleteSharedItemIntent,
  fetchSharedItemIntents,
  fetchSharedItems,
  sendEcoCampusMessage,
  SharedItem,
  SharedItemIntent,
} from '@/lib/ecocampus-api';
import { useProfile } from '@/contexts/ProfileContext';
import { assertValidUuid } from '@clstr/shared/utils/uuid';
import { supabase } from '@/integrations/supabase/client';

// Query keys for consistent cache management
const ECOCAMPUS_QUERY_KEYS = {
  sharedItems: ['ecocampus', 'shared-items'] as const,
  sharedItemIntents: (userId: string | undefined) => ['ecocampus', 'shared-item-intents', userId] as const,
};

const SharedItems = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [type, setType] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  // Track items with pending mutations to prevent double-clicks
  const [pendingIntents, setPendingIntents] = useState<Map<string, Set<'contact' | 'buy' | 'rent'>>>(new Map());
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { profile } = useProfile();
  const queryClient = useQueryClient();

  const {
    data: items = [],
    isLoading: isLoadingItems,
    error: itemsError,
  } = useQuery({
    queryKey: ECOCAMPUS_QUERY_KEYS.sharedItems,
    queryFn: fetchSharedItems,
    staleTime: 30_000, // 30 seconds
  });

  // Show error toast for items loading failure
  useEffect(() => {
    if (itemsError) {
      console.error('Error loading shared items:', itemsError);
      toast({
        title: 'Error',
        description: 'Failed to load shared items. Please refresh the page.',
        variant: 'destructive',
      });
    }
  }, [itemsError, toast]);

  const {
    data: intents = [],
    isLoading: isLoadingIntents,
    error: intentsError,
  } = useQuery({
    queryKey: ECOCAMPUS_QUERY_KEYS.sharedItemIntents(profile?.id),
    queryFn: fetchSharedItemIntents,
    enabled: !!profile?.id,
    staleTime: 10_000, // 10 seconds - more frequent updates for user's own data
  });

  // Show error toast for intents loading failure
  useEffect(() => {
    if (intentsError) {
      console.error('Error loading intents:', intentsError);
    }
  }, [intentsError]);

  useEffect(() => {
    const channel = supabase
      .channel(CHANNELS.marketplace.sharedItemsPublic())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shared_items' }, () => {
        queryClient.invalidateQueries({ queryKey: ECOCAMPUS_QUERY_KEYS.sharedItems });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  useEffect(() => {
    const domain = profile?.college_domain?.toLowerCase();
    if (!domain) return;

    const channel = supabase
      .channel(CHANNELS.marketplace.sharedItemsProfiles())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `college_domain=eq.${domain}` }, () => {
        queryClient.invalidateQueries({ queryKey: ECOCAMPUS_QUERY_KEYS.sharedItems });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.college_domain, queryClient]);

  // Realtime subscription for intents - updates when user sends or another user responds
  useEffect(() => {
    if (!profile?.id) return;
    assertValidUuid(profile.id, 'profileId');

    const channel = supabase
      .channel(CHANNELS.marketplace.sharedItemIntents(profile.id))
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shared_item_intents', filter: `requester_id=eq.${profile.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ECOCAMPUS_QUERY_KEYS.sharedItemIntents(profile.id) });
        }
      )
      // Also listen for intents where user is the seller
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shared_item_intents', filter: `seller_id=eq.${profile.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ECOCAMPUS_QUERY_KEYS.sharedItemIntents(profile.id) });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, queryClient]);

  // Apply filters
  const filteredItems = useMemo(() => {
    const loweredSearch = searchQuery.toLowerCase();
    return items.filter(item => {
      const effectiveType = item.share_type || (item.price?.toLowerCase() === 'free' ? 'donate' : 'sell');
      const matchesSearch = item.title.toLowerCase().includes(loweredSearch) ||
        item.description.toLowerCase().includes(loweredSearch);
      const matchesCategory = category === 'all' || item.category.toLowerCase() === category.toLowerCase();
      const matchesType = type === 'all' ||
        (type === 'free' && effectiveType === 'donate') ||
        (type === 'sell' && effectiveType === 'sell') ||
        (type === 'rent' && effectiveType === 'rent');
      return matchesSearch && matchesCategory && matchesType;
    });
  }, [items, searchQuery, category, type]);

  const getPriceLabel = (item: SharedItem) => {
    const effectiveType = item.share_type || (item.price?.toLowerCase() === 'free' ? 'donate' : 'sell');
    if (effectiveType === 'donate') return 'Free';

    const rawPrice = item.price?.trim() || '';
    const basePrice = rawPrice.startsWith('Ã¢â€šÂ¹') ? rawPrice : rawPrice ? `Ã¢â€šÂ¹${rawPrice}` : 'Ã¢â€šÂ¹0';
    if (effectiveType === 'rent') {
      return item.rent_unit ? `${basePrice}/${item.rent_unit}` : basePrice;
    }
    return basePrice;
  };

  const ensureValidSeller = (item: SharedItem) => {
    if (!item.user_id) {
      throw new Error('Listing is missing seller information');
    }
    assertValidUuid(item.user_id, 'sellerId');
    if (profile?.id && profile.id === item.user_id) {
      throw new Error('You are the owner of this listing');
    }
  };

  const sendSellerMessage = async (item: SharedItem, intent: 'contact' | 'buy' | 'rent') => {
    ensureValidSeller(item);
    const actionLine = intent === 'buy'
      ? 'I would like to buy this item. Please share the next steps.'
      : intent === 'rent'
        ? 'I would like to rent this item. Please share the next steps.'
        : 'I would like to connect regarding this item.';
    const body = `${actionLine}\n\nItem: ${item.title}\nPrice: ${getPriceLabel(item)}${item.location ? `\nLocation: ${item.location}` : ''}`;
    await sendEcoCampusMessage(item.user_id, body);
  };

  // Helper to add/remove pending intent for an item
  const setPendingIntent = useCallback((itemId: string, intentType: 'contact' | 'buy' | 'rent', isPending: boolean) => {
    setPendingIntents((prev) => {
      const newMap = new Map(prev);
      const itemPending = new Set(prev.get(itemId) || []);
      if (isPending) {
        itemPending.add(intentType);
      } else {
        itemPending.delete(intentType);
      }
      if (itemPending.size === 0) {
        newMap.delete(itemId);
      } else {
        newMap.set(itemId, itemPending);
      }
      return newMap;
    });
  }, []);

  const intentMutation = useMutation({
    mutationFn: async ({ item, intent }: { item: SharedItem; intent: SharedItemIntent['intent_type'] }) => {
      if (!item.user_id) throw new Error('Listing is missing seller information');
      const intentRow = await createSharedItemIntent(item.id, item.user_id, intent);
      try {
        await sendSellerMessage(item, intent);
      } catch (error) {
        await deleteSharedItemIntent(intentRow.id).catch(() => undefined);
        throw error;
      }
      return intentRow;
    },
    onMutate: ({ item, intent }) => {
      setPendingIntent(item.id, intent, true);
    },
    onError: (error, variables) => {
      setPendingIntent(variables.item.id, variables.intent, false);
    },
    onSuccess: (data, variables) => {
      setPendingIntent(variables.item.id, variables.intent, false);
    },
    onSettled: () => {
      // Always refetch to ensure server state is synced
      queryClient.invalidateQueries({ queryKey: ECOCAMPUS_QUERY_KEYS.sharedItemIntents(profile?.id) });
    },
  });

  const handleContactClick = async (item: SharedItem) => {
    // Check if already sent or pending
    const existingIntent = intentMap.get(item.id);
    if (existingIntent?.contact) {
      toast({
        title: 'Already sent',
        description: 'You have already contacted the seller for this item.',
      });
      return;
    }
    if (pendingIntents.get(item.id)?.has('contact')) {
      return; // Already in progress
    }

    try {
      await intentMutation.mutateAsync({ item, intent: 'contact' });
      toast({
        title: 'Message sent',
        description: 'The owner has been notified of your interest.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to contact seller';
      toast({ title: 'Contact failed', description: message, variant: 'destructive' });
    }
  };

  const handlePaidActionClick = async (item: SharedItem) => {
    const actionIntent: SharedItemIntent['intent_type'] = item.share_type === 'rent' ? 'rent' : 'buy';
    const existingIntent = intentMap.get(item.id);
    if (existingIntent?.[actionIntent]) {
      toast({
        title: 'Already sent',
        description: actionIntent === 'rent'
          ? 'You have already sent a rent request for this item.'
          : 'You have already sent a buy request for this item.',
      });
      return;
    }
    if (pendingIntents.get(item.id)?.has(actionIntent)) {
      return; // Already in progress
    }

    try {
      await intentMutation.mutateAsync({ item, intent: actionIntent });
      toast({
        title: 'Request sent',
        description: actionIntent === 'rent'
          ? 'The owner has been notified of your request to rent.'
          : 'The owner has been notified of your request to buy.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to contact seller';
      toast({ title: 'Request failed', description: message, variant: 'destructive' });
    }
  };

  const intentMap = useMemo(() => {
    const map = new Map<string, { contact: boolean; buy: boolean; rent: boolean }>();
    intents.forEach((intent) => {
      const current = map.get(intent.item_id) ?? { contact: false, buy: false, rent: false };
      if (intent.intent_type === 'contact') current.contact = true;
      if (intent.intent_type === 'buy') current.buy = true;
      if (intent.intent_type === 'rent') current.rent = true;
      map.set(intent.item_id, current);
    });
    return map;
  }, [intents]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Search bar */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          <Input
            placeholder="Search items..."
            className="pl-10 w-full bg-white/[0.06] border-white/10 text-white placeholder:text-white/30 focus:border-white/25 focus:ring-white/10 h-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full sm:w-[120px] min-w-[100px] bg-white/[0.06] border-white/10 text-white/70">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a1a] border-white/10">
              <SelectItem value="all">All Items</SelectItem>
              <SelectItem value="books">Books</SelectItem>
              <SelectItem value="instruments">Instruments</SelectItem>
              <SelectItem value="clothing">Clothing</SelectItem>
              <SelectItem value="electronics">Electronics</SelectItem>
            </SelectContent>
          </Select>

          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-full sm:w-[120px] min-w-[100px] bg-white/[0.06] border-white/10 text-white/70">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a1a] border-white/10">
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="free">Donate</SelectItem>
              <SelectItem value="sell">Sell</SelectItem>
              <SelectItem value="rent">Rent</SelectItem>
            </SelectContent>
          </Select>

          {/* Grid/List toggle */}
          <div className="flex border border-white/10 rounded-lg overflow-hidden">
            <button
              className={`px-2.5 py-2 transition-all ${viewMode === 'grid' ? 'bg-white/[0.10] text-white' : 'text-white/40 hover:text-white/60 hover:bg-white/[0.04]'}`}
              onClick={() => setViewMode('grid')}
            >
              <Grid2X2 className="h-4 w-4" />
            </button>
            <button
              className={`px-2.5 py-2 transition-all ${viewMode === 'list' ? 'bg-white/[0.10] text-white' : 'text-white/40 hover:text-white/60 hover:bg-white/[0.04]'}`}
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {isLoadingItems && (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-white/40" />
          <span className="ml-2 text-white/50">Loading items...</span>
        </div>
      )}

      {/* Items grid */}
      {!isLoadingItems && (
        <div className={`grid gap-3 md:gap-4 ${viewMode === 'grid' 
          ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' 
          : 'grid-cols-1'}`}>
          {filteredItems.map((item) => {
            const itemIntent = intentMap.get(item.id);
            const contactSent = itemIntent?.contact ?? false;
            const actionIntent: SharedItemIntent['intent_type'] = item.share_type === 'rent' ? 'rent' : 'buy';
            const actionSent = itemIntent?.[actionIntent] ?? false;
            const isOwner = profile?.id && profile.id === item.user_id;
            const contactPending = pendingIntents.get(item.id)?.has('contact') ?? false;
            const actionPending = pendingIntents.get(item.id)?.has(actionIntent) ?? false;
            return (
              <div key={item.id} className="rounded-xl bg-white/[0.04] border border-white/10 overflow-hidden h-full flex flex-col hover:bg-white/[0.06] transition-colors">
                <div className={`${viewMode === 'list' ? 'flex' : 'flex flex-col'} h-full`}>
                  <img
                    src={item.image || '/placeholder.svg'}
                    alt={item.title}
                    className={`object-cover ${viewMode === 'list'
                      ? 'w-24 md:w-32 h-full'
                      : 'w-full h-40 md:h-48'}`}
                  />
                  <div className="p-3 md:p-4 flex-1 flex flex-col">
                    <div className="flex justify-between items-start gap-2 mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base md:text-lg text-white line-clamp-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{item.title}</h3>
                        <p className="text-xs md:text-sm text-white/50 line-clamp-2">{item.description}</p>
                      </div>
                      <span className="px-2 py-1 rounded-full text-xs flex-shrink-0 bg-white/[0.08] text-white/80 border border-white/10">
                        {getPriceLabel(item)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-auto mb-2">
                      <Avatar className="h-7 w-7 md:h-8 md:w-8 flex-shrink-0">
                        <img src={item.seller?.avatar || '/placeholder.svg'} alt={item.seller?.name || 'Seller'} />
                      </Avatar>
                      <div className="text-xs md:text-sm min-w-0 flex-1">
                        <p className="truncate font-medium text-white/70">{item.seller?.name || 'Anonymous'}</p>
                      </div>
                    </div>

                    <div className="text-xs text-white/35 mb-3 space-y-0.5">
                      <p className="truncate">Ã°Å¸â€œÂ {item.location || 'Pickup point not specified'}</p>
                    </div>

                    <div className="flex gap-2">
                      <button 
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs md:text-sm bg-white/10 hover:bg-white/15 text-white border border-white/15 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        onClick={() => handleContactClick(item)}
                        disabled={!item.user_id || isOwner || contactSent || contactPending || isLoadingIntents}
                      >
                        {contactPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <MessageSquare className="h-3.5 w-3.5" />
                        )}
                        <span className="truncate">{contactSent ? 'Sent' : contactPending ? 'Sending...' : 'Contact'}</span>
                      </button>
                      {item.share_type !== 'donate' && (
                        <button 
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs md:text-sm bg-white/10 hover:bg-white/15 text-white border border-white/15 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                          onClick={() => handlePaidActionClick(item)}
                          disabled={!item.user_id || isOwner || actionSent || actionPending || isLoadingIntents}
                        >
                          {actionPending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <ShoppingCart className="h-3.5 w-3.5" />
                          )}
                          <span className="truncate">
                            {actionSent
                              ? 'Sent'
                              : actionPending
                                ? 'Sending...'
                                : item.share_type === 'rent'
                                  ? 'Rent'
                                  : 'Buy'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!isLoadingItems && filteredItems.length === 0 && (
        <div className="rounded-xl bg-white/[0.04] border border-white/10 p-12 text-center">
          <p className="text-white/40">
            {items.length === 0 
              ? 'No shared items yet. Be the first to share something!'
              : 'No items match your search criteria.'}
          </p>
        </div>
      )}

      {/* Error state */}
      {itemsError && !isLoadingItems && (
        <div className="rounded-xl bg-white/[0.04] border border-white/10 p-12 text-center">
          <p className="text-white/50 mb-2">Failed to load shared items.</p>
          <button 
            onClick={() => queryClient.invalidateQueries({ queryKey: ECOCAMPUS_QUERY_KEYS.sharedItems })}
            className="text-sm text-white/60 underline hover:text-white/80 transition-colors"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
};

export default SharedItems;
