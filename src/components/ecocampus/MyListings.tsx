
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  fetchMySharedItems, 
  fetchMyRequests,
  updateSharedItemStatus, 
  deleteSharedItem, 
  deleteItemRequest,
  updateSharedItemDetails,
  updateItemRequest,
  SharedItem,
  ItemRequest
} from '@/lib/ecocampus-api';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useProfile } from '@/contexts/ProfileContext';
import { supabase } from '@/integrations/supabase/client';

// Query keys for consistent cache management
const ECOCAMPUS_QUERY_KEYS = {
  sharedItems: ['ecocampus', 'shared-items'] as const,
  itemRequests: ['ecocampus', 'item-requests'] as const,
  mySharedItems: (userId: string | undefined) => ['ecocampus', 'my-shared-items', userId] as const,
  myItemRequests: (userId: string | undefined) => ['ecocampus', 'my-item-requests', userId] as const,
};

const MyListings = () => {
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editSharedItem, setEditSharedItem] = useState<SharedItem | null>(null);
  const [editRequest, setEditRequest] = useState<ItemRequest | null>(null);
  const [isEditSharedOpen, setIsEditSharedOpen] = useState(false);
  const [isEditRequestOpen, setIsEditRequestOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [innerTab, setInnerTab] = useState<'shared' | 'requests'>('shared');
  const { toast } = useToast();
  const { profile } = useProfile();
  const queryClient = useQueryClient();

  const getPriceLabel = (item: SharedItem) => {
    if (item.share_type === 'donate') return 'Free';
    const rawPrice = item.price?.trim() || '';
    const basePrice = rawPrice.startsWith('₹') ? rawPrice : rawPrice ? `₹${rawPrice}` : '₹0';
    if (item.share_type === 'rent') {
      return item.rent_unit ? `${basePrice}/${item.rent_unit}` : basePrice;
    }
    return basePrice;
  };

  const { data: sharedItems = [], isLoading: isLoadingShared, error: sharedError } = useQuery({
    queryKey: ECOCAMPUS_QUERY_KEYS.mySharedItems(profile?.id),
    queryFn: fetchMySharedItems,
    enabled: !!profile?.id,
    staleTime: 10_000,
  });

  // Show error toast for shared items loading failure
  useEffect(() => {
    if (sharedError) {
      console.error('Error loading my shared items:', sharedError);
      toast({
        title: 'Error',
        description: 'Failed to load your shared items',
        variant: 'destructive',
      });
    }
  }, [sharedError, toast]);

  const { data: requests = [], isLoading: isLoadingRequests, error: requestsError } = useQuery({
    queryKey: ECOCAMPUS_QUERY_KEYS.myItemRequests(profile?.id),
    queryFn: fetchMyRequests,
    enabled: !!profile?.id,
    staleTime: 10_000,
  });

  // Show error toast for requests loading failure
  useEffect(() => {
    if (requestsError) {
      console.error('Error loading my requests:', requestsError);
      toast({
        title: 'Error',
        description: 'Failed to load your requests',
        variant: 'destructive',
      });
    }
  }, [requestsError, toast]);

  const toggleItemStatus = async (id: string) => {
    try {
      const item = sharedItems.find(item => item.id === id);
      if (!item) return;
      
      const newStatus = item.status === 'available' ? 'taken' : 'available';

      await updateSharedItemStatus(id, newStatus);
      queryClient.invalidateQueries({ queryKey: ECOCAMPUS_QUERY_KEYS.mySharedItems(profile?.id) });
      queryClient.invalidateQueries({ queryKey: ECOCAMPUS_QUERY_KEYS.sharedItems });
      
      toast({
        title: "Status Updated",
        description: `Item is now marked as ${newStatus}`,
      });
    } catch (error) {
      console.error('Error toggling item status:', error);
      toast({
        title: "Error",
        description: "Failed to update item status",
        variant: "destructive",
      });
    }
  };

  const handleDeleteItem = (type: 'shared' | 'request', id: string) => {
    setItemToDelete(`${type}-${id}`);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    
    try {
      if (itemToDelete.startsWith('shared-')) {
        const id = itemToDelete.replace('shared-', '');

        await deleteSharedItem(id);
        queryClient.invalidateQueries({ queryKey: ECOCAMPUS_QUERY_KEYS.mySharedItems(profile?.id) });
        queryClient.invalidateQueries({ queryKey: ECOCAMPUS_QUERY_KEYS.sharedItems });
        
        toast({
          title: "Item Deleted",
          description: "Your shared item has been removed",
        });
      } else {
        const id = itemToDelete.replace('request-', '');

        await deleteItemRequest(id);
        queryClient.invalidateQueries({ queryKey: ECOCAMPUS_QUERY_KEYS.myItemRequests(profile?.id) });
        queryClient.invalidateQueries({ queryKey: ECOCAMPUS_QUERY_KEYS.itemRequests });
        
        toast({
          title: "Request Deleted",
          description: "Your item request has been removed",
        });
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: "Error",
        description: "Failed to delete the item",
        variant: "destructive",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const handleOpenEditShared = (item: SharedItem) => {
    setEditSharedItem(item);
    setIsEditSharedOpen(true);
  };

  const handleOpenEditRequest = (request: ItemRequest) => {
    setEditRequest(request);
    setIsEditRequestOpen(true);
  };

  const handleSaveShared = async () => {
    if (!editSharedItem) return;
    setEditLoading(true);
    try {
      const normalizedPrice = editSharedItem.share_type === 'donate' ? '' : editSharedItem.price;
      const normalizedRentUnit = editSharedItem.share_type === 'rent' ? editSharedItem.rent_unit : undefined;
      const updated = await updateSharedItemDetails(editSharedItem.id, {
        title: editSharedItem.title,
        description: editSharedItem.description,
        price: normalizedPrice,
        share_type: editSharedItem.share_type,
        rent_unit: normalizedRentUnit,
        category: editSharedItem.category,
        location: editSharedItem.location,
        status: editSharedItem.status,
        image: editSharedItem.image,
      });
      queryClient.invalidateQueries({ queryKey: ECOCAMPUS_QUERY_KEYS.mySharedItems(profile?.id) });
      queryClient.invalidateQueries({ queryKey: ECOCAMPUS_QUERY_KEYS.sharedItems });
      toast({ title: 'Listing updated', description: 'Your item has been updated.' });
      setIsEditSharedOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update item';
      toast({ title: 'Update failed', description: message, variant: 'destructive' });
    } finally {
      setEditLoading(false);
    }
  };

  const handleSaveRequest = async () => {
    if (!editRequest) return;
    setEditLoading(true);
    try {
      const updated = await updateItemRequest(editRequest.id, {
        item: editRequest.item,
        description: editRequest.description,
        urgency: editRequest.urgency,
        preference: editRequest.preference,
      });
      queryClient.invalidateQueries({ queryKey: ECOCAMPUS_QUERY_KEYS.myItemRequests(profile?.id) });
      queryClient.invalidateQueries({ queryKey: ECOCAMPUS_QUERY_KEYS.itemRequests });
      toast({ title: 'Request updated', description: 'Your request has been updated.' });
      setIsEditRequestOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update request';
      toast({ title: 'Update failed', description: message, variant: 'destructive' });
    } finally {
      setEditLoading(false);
    }
  };

  // Realtime refresh for current user's items/requests
  useEffect(() => {
    if (!profile?.id) return;
    const channel = supabase
      .channel(`ecocampus-${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shared_items', filter: `user_id=eq.${profile.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ECOCAMPUS_QUERY_KEYS.mySharedItems(profile.id) });
        queryClient.invalidateQueries({ queryKey: ECOCAMPUS_QUERY_KEYS.sharedItems });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'item_requests', filter: `user_id=eq.${profile.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ECOCAMPUS_QUERY_KEYS.myItemRequests(profile.id) });
        queryClient.invalidateQueries({ queryKey: ECOCAMPUS_QUERY_KEYS.itemRequests });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, queryClient]);

  return (
    <div>
      {/* Inner tabs — translucent container */}
      <div className="rounded-xl bg-white/[0.04] border border-white/10 p-1 flex gap-1 mb-4">
        {([{ key: 'shared' as const, label: 'My Shared Items' }, { key: 'requests' as const, label: 'My Requests' }]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setInnerTab(tab.key)}
            className={`flex-1 flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              innerTab === tab.key
                ? 'bg-white/[0.10] text-white border border-white/15'
                : 'text-white/45 hover:text-white/70 hover:bg-white/[0.04] border border-transparent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Shared Items Tab */}
      {innerTab === 'shared' && (
        <>
          {isLoadingShared ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-white/40" />
              <span className="ml-2 text-white/50">Loading your shared items...</span>
            </div>
          ) : (
            <div className="space-y-3">
              {sharedItems.map((item) => (
                <div key={item.id} className={`rounded-xl bg-white/[0.04] border border-white/10 p-4 sm:p-5 hover:bg-white/[0.06] transition-colors ${item.status === 'taken' ? 'opacity-60' : ''}`}>
                  <div className="flex gap-3 md:gap-4">
                    <img
                      src={item.image || '/placeholder.svg'}
                      alt={item.title}
                      className="w-20 h-20 md:w-24 md:h-24 object-cover rounded-lg flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm md:text-base text-white line-clamp-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{item.title}</h3>
                          <p className="text-xs md:text-sm text-white/50 line-clamp-2">{item.description}</p>
                          <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-white/[0.08] text-white/70 border border-white/10">
                            {getPriceLabel(item)}
                          </span>
                        </div>
                        
                        <div className="flex gap-1 flex-shrink-0">
                          <button className="h-8 w-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/[0.08] transition-all" onClick={() => handleOpenEditShared(item)}>
                            <Edit className="h-4 w-4" />
                          </button>
                          <button 
                            className="h-8 w-8 flex items-center justify-center rounded-lg text-white/50 hover:text-red-400 hover:bg-white/[0.08] transition-all"
                            onClick={() => handleDeleteItem('shared', item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mt-3 pt-3 border-t border-white/[0.06]">
                        <div className="flex items-center space-x-2">
                          <Switch 
                            id={`status-${item.id}`} 
                            checked={item.status === 'available'} 
                            onCheckedChange={() => toggleItemStatus(item.id)}
                          />
                          <Label htmlFor={`status-${item.id}`} className="text-xs md:text-sm text-white/60">
                            {item.status === 'available' ? 'Available' : 'Taken'}
                          </Label>
                        </div>
                        <span className="text-xs text-white/35 truncate">
                          Category: {item.category}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {sharedItems.length === 0 && (
                <div className="rounded-xl bg-white/[0.04] border border-white/10 p-12 text-center">
                  <p className="text-white/40">You haven't shared any items yet.</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Requests Tab */}
      {innerTab === 'requests' && (
        <>
          {isLoadingRequests ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-white/40" />
              <span className="ml-2 text-white/50">Loading your requests...</span>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <div key={request.id} className="rounded-xl bg-white/[0.04] border border-white/10 p-4 sm:p-5 hover:bg-white/[0.06] transition-colors">
                  <div className="flex justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm md:text-base text-white line-clamp-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{request.item}</h3>
                      <p className="text-xs md:text-sm text-white/50 line-clamp-2">{request.description}</p>
                      <p className="text-xs md:text-sm text-white/45 mt-1 truncate">{request.urgency}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-white/[0.08] text-white/70 border border-white/10">
                        {request.preference}
                      </span>
                    </div>
                    
                    <div className="flex gap-1 flex-shrink-0">
                      <button className="h-8 w-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/[0.08] transition-all" onClick={() => handleOpenEditRequest(request)}>
                        <Edit className="h-4 w-4" />
                      </button>
                      <button 
                        className="h-8 w-8 flex items-center justify-center rounded-lg text-white/50 hover:text-red-400 hover:bg-white/[0.08] transition-all"
                        onClick={() => handleDeleteItem('request', request.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {requests.length === 0 && (
                <div className="rounded-xl bg-white/[0.04] border border-white/10 p-12 text-center">
                  <p className="text-white/40">You haven't made any requests yet.</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="bg-[#111111] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Item</DialogTitle>
          </DialogHeader>
          <p className="text-white/60">Are you sure you want to delete this item? This action cannot be undone.</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} className="border-white/15 text-white/70 bg-transparent hover:bg-white/[0.06]">Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditSharedOpen} onOpenChange={setIsEditSharedOpen}>
        <DialogContent className="bg-[#111111] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Edit shared item</DialogTitle>
          </DialogHeader>
          {editSharedItem && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-white/70">Title</label>
                <Input
                  value={editSharedItem.title}
                  onChange={(e) => setEditSharedItem({ ...editSharedItem, title: e.target.value })}
                  placeholder="Title"
                  className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/30"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-white/70">Description</label>
                <Textarea
                  value={editSharedItem.description}
                  onChange={(e) => setEditSharedItem({ ...editSharedItem, description: e.target.value })}
                  placeholder="Describe your item"
                  rows={3}
                  className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/30"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-white/70">Type</label>
                <Select
                  value={editSharedItem.share_type}
                  onValueChange={(value) => setEditSharedItem({ ...editSharedItem, share_type: value as SharedItem['share_type'] })}
                >
                  <SelectTrigger className="bg-white/[0.06] border-white/10 text-white/70">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-white/10">
                    <SelectItem value="donate">Donate</SelectItem>
                    <SelectItem value="sell">Sell</SelectItem>
                    <SelectItem value="rent">Rent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editSharedItem.share_type !== 'donate' && (
                <div className="space-y-1">
                  <label className="text-sm font-medium text-white/70">
                    {editSharedItem.share_type === 'rent' ? 'Rent Price' : 'Price'}
                  </label>
                  <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2">
                    <span className="text-sm font-semibold text-white/50 select-none">₹</span>
                    <Input
                      className="border-0 shadow-none px-0 focus-visible:ring-0 bg-transparent text-white placeholder:text-white/30"
                      value={editSharedItem.price}
                      onChange={(e) => setEditSharedItem({ ...editSharedItem, price: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>
              )}

              {editSharedItem.share_type === 'rent' && (
                <div className="space-y-1">
                  <label className="text-sm font-medium text-white/70">Rent Unit</label>
                  <Select
                    value={editSharedItem.rent_unit || 'day'}
                    onValueChange={(value) => setEditSharedItem({ ...editSharedItem, rent_unit: value as SharedItem['rent_unit'] })}
                  >
                    <SelectTrigger className="bg-white/[0.06] border-white/10 text-white/70">
                      <SelectValue placeholder="Select rent unit" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1a] border-white/10">
                      <SelectItem value="day">Per day</SelectItem>
                      <SelectItem value="week">Per week</SelectItem>
                      <SelectItem value="month">Per month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-sm font-medium text-white/70">Category</label>
                <Select
                  value={editSharedItem.category}
                  onValueChange={(value) => setEditSharedItem({ ...editSharedItem, category: value })}
                >
                  <SelectTrigger className="bg-white/[0.06] border-white/10 text-white/70">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-white/10">
                    <SelectItem value="books">Books</SelectItem>
                    <SelectItem value="electronics">Electronics</SelectItem>
                    <SelectItem value="clothing">Clothing</SelectItem>
                    <SelectItem value="instruments">Instruments</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-white/70">Location</label>
                <Input
                  value={editSharedItem.location || ''}
                  onChange={(e) => setEditSharedItem({ ...editSharedItem, location: e.target.value })}
                  placeholder="e.g., Hostel Block A"
                  className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/30"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-white/70">Status</label>
                <Select
                  value={editSharedItem.status}
                  onValueChange={(value) => setEditSharedItem({ ...editSharedItem, status: value as SharedItem['status'] })}
                >
                  <SelectTrigger className="bg-white/[0.06] border-white/10 text-white/70">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-white/10">
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="taken">Taken</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setIsEditSharedOpen(false)} disabled={editLoading} className="border-white/15 text-white/70 bg-transparent hover:bg-white/[0.06]">Cancel</Button>
                <Button onClick={handleSaveShared} disabled={editLoading} className="bg-white/10 hover:bg-white/15 text-white border border-white/15">
                  {editLoading ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isEditRequestOpen} onOpenChange={setIsEditRequestOpen}>
        <DialogContent className="bg-[#111111] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Edit request</DialogTitle>
          </DialogHeader>
          {editRequest && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-white/70">Item Name</label>
                <Input
                  value={editRequest.item}
                  onChange={(e) => setEditRequest({ ...editRequest, item: e.target.value })}
                  placeholder="Item name"
                  className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/30"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-white/70">Description</label>
                <Textarea
                  value={editRequest.description}
                  onChange={(e) => setEditRequest({ ...editRequest, description: e.target.value })}
                  placeholder="Describe what you need"
                  rows={3}
                  className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/30"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-white/70">Urgency</label>
                <Select
                  value={editRequest.urgency}
                  onValueChange={(value) => setEditRequest({ ...editRequest, urgency: value })}
                >
                  <SelectTrigger className="bg-white/[0.06] border-white/10 text-white/70">
                    <SelectValue placeholder="Select urgency" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-white/10">
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-white/70">Preferred Condition</label>
                <Select
                  value={editRequest.preference || ''}
                  onValueChange={(value) => setEditRequest({ ...editRequest, preference: value })}
                >
                  <SelectTrigger className="bg-white/[0.06] border-white/10 text-white/70">
                    <SelectValue placeholder="Select preference" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-white/10">
                    <SelectItem value="Any condition">Any condition</SelectItem>
                    <SelectItem value="Used only">Used only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setIsEditRequestOpen(false)} disabled={editLoading} className="border-white/15 text-white/70 bg-transparent hover:bg-white/[0.06]">Cancel</Button>
                <Button onClick={handleSaveRequest} disabled={editLoading} className="bg-white/10 hover:bg-white/15 text-white border border-white/15">
                  {editLoading ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default MyListings;
