/**
 * EcoCampus Screen — Phase 9.6
 *
 * Browse shared items and item requests.
 * Tabs: Shared Items / Requests / My Listings
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

import { useThemeColors } from '@/constants/colors';
import { fontFamily, fontSize } from '@/constants/typography';
import {
  fetchSharedItems,
  fetchRequests,
  fetchMySharedItems,
  deleteSharedItem,
  createSharedItemIntent,
  createSharedItem,
  createItemRequest,
} from '@/lib/api/ecocampus';
import type { SharedItem, ItemRequest } from '@/lib/api/ecocampus';
import { useIdentityContext } from '@/lib/contexts/IdentityProvider';
import { useFeatureAccess } from '@/lib/hooks/useFeatureAccess';

type TabKey = 'items' | 'requests' | 'mine';

// ─── Shared Item Card ────────────────────────────────────────

const SharedItemCard = React.memo(function SharedItemCard({
  item,
  colors,
  onClaim,
  onDelete,
}: {
  item: SharedItem;
  colors: ReturnType<typeof useThemeColors>;
  onClaim?: (itemId: string) => void;
  onDelete?: (itemId: string) => void;
}) {
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {item.image && (
        <Image source={{ uri: item.image }} style={styles.itemImage} resizeMode="cover" />
      )}
      <View style={styles.cardBody}>
        <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
          {item.title}
        </Text>
        {item.description && (
          <Text style={[styles.cardDesc, { color: colors.textSecondary }]} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        <View style={styles.cardFooter}>
          <View style={[styles.conditionBadge, { backgroundColor: colors.surfaceSecondary }]}>
            <Text style={[styles.conditionText, { color: colors.textTertiary }]}>
              {item.share_type ?? 'Free'}
            </Text>
          </View>
          {item.category && (
            <Text style={[styles.categoryText, { color: colors.textTertiary }]}>
              {item.category}
            </Text>
          )}
        </View>
        <View style={styles.cardActionsRow}>
          {onClaim && item.status === 'available' && (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onClaim(item.id);
              }}
              style={[styles.claimBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.claimBtnText}>I'm Interested</Text>
            </Pressable>
          )}
          {onDelete && (
            <Pressable
              onPress={() => {
                Alert.alert('Delete Listing', 'Are you sure you want to delete this listing?', [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => onDelete(item.id),
                  },
                ]);
              }}
              style={[styles.deleteBtn, { borderColor: colors.danger }]}
            >
              <Ionicons name="trash-outline" size={14} color={colors.danger} />
              <Text style={[styles.deleteBtnText, { color: colors.danger }]}>Delete</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
});

// ─── Request Card ────────────────────────────────────────────

const RequestCard = React.memo(function RequestCard({
  request,
  colors,
}: {
  request: ItemRequest;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardBody}>
        <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
          {request.item}
        </Text>
        {request.description && (
          <Text style={[styles.cardDesc, { color: colors.textSecondary }]} numberOfLines={2}>
            {request.description}
          </Text>
        )}
        <View style={styles.cardFooter}>
          {request.preference && (
            <View style={[styles.conditionBadge, { backgroundColor: colors.surfaceSecondary }]}>
              <Text style={[styles.conditionText, { color: colors.textTertiary }]}>
                {request.preference}
              </Text>
            </View>
          )}
          <Text style={[styles.categoryText, { color: colors.textTertiary }]}>
            {request.urgency ?? 'Normal'}
          </Text>
        </View>
      </View>
    </View>
  );
});

// ─── Screen ──────────────────────────────────────────────────

export default function EcoCampusScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { identity, collegeDomain } = useIdentityContext();
  const userId = identity?.user_id ?? '';
  const domain = collegeDomain ?? '';
  const { canBrowseEcoCampus, canCreateListing } = useFeatureAccess();
  const [tab, setTab] = useState<TabKey>('items');

  const itemsQ = useQuery({
    queryKey: ['eco', 'items', domain],
    queryFn: () => fetchSharedItems(),
    enabled: tab === 'items' && canBrowseEcoCampus,
    staleTime: 30_000,
  });

  const requestsQ = useQuery({
    queryKey: ['eco', 'requests', domain],
    queryFn: () => fetchRequests(),
    enabled: tab === 'requests' && canBrowseEcoCampus,
    staleTime: 30_000,
  });

  const myQ = useQuery({
    queryKey: ['eco', 'mine', userId],
    queryFn: () => fetchMySharedItems(),
    enabled: tab === 'mine' && !!userId,
    staleTime: 30_000,
  });

  const intentMut = useMutation({
    mutationFn: (itemId: string) => {
      const item = (itemsQ.data ?? []).find((i: SharedItem) => i.id === itemId);
      return createSharedItemIntent(itemId, item?.user_id ?? '', 'contact');
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['eco', 'items'] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (itemId: string) => deleteSharedItem(itemId),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['eco'] });
    },
    onError: (err: Error) => Alert.alert('Error', err.message ?? 'Failed to delete listing.'),
  });

  // ── Create Item form state ─────────────────────────────────
  const [showCreateItem, setShowCreateItem] = useState(false);
  const [itemTitle, setItemTitle] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [itemCategory, setItemCategory] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemShareType, setItemShareType] = useState<'donate' | 'sell' | 'rent'>('donate');

  const createItemMut = useMutation({
    mutationFn: () =>
      createSharedItem({
        title: itemTitle.trim(),
        description: itemDesc.trim(),
        category: itemCategory.trim() || 'General',
        price: itemShareType === 'donate' ? '0' : itemPrice.trim(),
        share_type: itemShareType,
      } as any),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowCreateItem(false);
      queryClient.invalidateQueries({ queryKey: ['eco'] });
      Alert.alert('Success', 'Your item has been listed!');
    },
    onError: (err: Error) => Alert.alert('Error', err.message ?? 'Failed to create listing.'),
  });

  const handleCreateItem = useCallback(() => {
    if (!itemTitle.trim()) {
      Alert.alert('Title Required', 'Please enter a title for your item.');
      return;
    }
    createItemMut.mutate();
  }, [itemTitle, createItemMut]);

  // ── Create Request form state ──────────────────────────────
  const [showCreateRequest, setShowCreateRequest] = useState(false);
  const [reqItem, setReqItem] = useState('');
  const [reqDesc, setReqDesc] = useState('');
  const [reqUrgency, setReqUrgency] = useState('normal');

  const createReqMut = useMutation({
    mutationFn: () =>
      createItemRequest({
        item: reqItem.trim(),
        description: reqDesc.trim(),
        urgency: reqUrgency,
        preference: '',
      } as any),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowCreateRequest(false);
      queryClient.invalidateQueries({ queryKey: ['eco'] });
      Alert.alert('Success', 'Your request has been posted!');
    },
    onError: (err: Error) => Alert.alert('Error', err.message ?? 'Failed to create request.'),
  });

  const handleCreateRequest = useCallback(() => {
    if (!reqItem.trim()) {
      Alert.alert('Item Required', 'Please describe what you need.');
      return;
    }
    createReqMut.mutate();
  }, [reqItem, createReqMut]);

  const tabs: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'items', label: 'Items', icon: 'leaf-outline' },
    { key: 'requests', label: 'Requests', icon: 'hand-left-outline' },
    { key: 'mine', label: 'My Listings', icon: 'person-outline' },
  ];

  const queryMap = { items: itemsQ, requests: requestsQ, mine: myQ };
  const activeQ = queryMap[tab];
  const activeData = (activeQ.data ?? []) as any[];

  const renderItem = useCallback(
    ({ item }: { item: any }) => {
      if (tab === 'requests') {
        return <RequestCard request={item} colors={colors} />;
      }
      return (
        <SharedItemCard
          item={item}
          colors={colors}
          onClaim={tab === 'items' ? (id) => intentMut.mutate(id) : undefined}
          onDelete={tab === 'mine' ? (id) => deleteMut.mutate(id) : undefined}
        />
      );
    },
    [colors, tab, intentMut, deleteMut],
  );

  const keyExtractor = useCallback((item: any) => item.id, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 8), borderBottomColor: colors.border },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>EcoCampus</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        {tabs.map((t) => (
          <Pressable
            key={t.key}
            onPress={() => {
              Haptics.selectionAsync();
              setTab(t.key);
            }}
            style={[styles.tab, tab === t.key && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          >
            <Ionicons
              name={t.icon}
              size={16}
              color={tab === t.key ? colors.primary : colors.textTertiary}
            />
            <Text
              style={[
                styles.tabLabel,
                { color: tab === t.key ? colors.primary : colors.textTertiary },
              ]}
            >
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Content */}
      {activeQ.isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : activeData.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="leaf-outline" size={56} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Nothing here yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            {tab === 'mine'
              ? 'Your shared items will appear here'
              : 'Be the first to share or request something!'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={activeData}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={10}
          removeClippedSubviews={Platform.OS === 'android'}
          refreshControl={
            <RefreshControl
              refreshing={activeQ.isRefetching}
              onRefresh={activeQ.refetch}
              tintColor={colors.primary}
            />
          }
        />
      )}

      {/* FAB — Create Item or Request */}
      {canCreateListing && (
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            if (tab === 'requests') {
              setReqItem('');
              setReqDesc('');
              setReqUrgency('normal');
              setShowCreateRequest(true);
            } else {
              setItemTitle('');
              setItemDesc('');
              setItemCategory('');
              setItemPrice('');
              setItemShareType('donate');
              setShowCreateItem(true);
            }
          }}
          style={[styles.fab, { backgroundColor: colors.primary }]}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </Pressable>
      )}

      {/* Create Shared Item Modal */}
      <Modal visible={showCreateItem} transparent animationType="fade" onRequestClose={() => setShowCreateItem(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <Pressable style={styles.modalOverlay} onPress={() => setShowCreateItem(false)}>
            <Pressable style={[styles.modalContent, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation?.()}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Share an Item</Text>

                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Title *</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border }]}
                  placeholder="e.g., Organic Chemistry Textbook"
                  placeholderTextColor={colors.textTertiary}
                  value={itemTitle}
                  onChangeText={setItemTitle}
                  maxLength={100}
                />

                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Description</Text>
                <TextInput
                  style={[styles.modalInput, styles.modalTextarea, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border }]}
                  placeholder="Describe condition, availability, etc."
                  placeholderTextColor={colors.textTertiary}
                  value={itemDesc}
                  onChangeText={setItemDesc}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  maxLength={500}
                />

                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Category</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border }]}
                  placeholder="e.g., Books, Electronics, Clothing"
                  placeholderTextColor={colors.textTertiary}
                  value={itemCategory}
                  onChangeText={setItemCategory}
                  maxLength={50}
                />

                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Share Type</Text>
                <View style={styles.shareTypeRow}>
                  {(['donate', 'sell', 'rent'] as const).map((st) => (
                    <Pressable
                      key={st}
                      onPress={() => setItemShareType(st)}
                      style={[
                        styles.shareTypeChip,
                        {
                          backgroundColor: itemShareType === st ? colors.primary : colors.surfaceSecondary,
                          borderColor: itemShareType === st ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.shareTypeText,
                          { color: itemShareType === st ? '#FFFFFF' : colors.textSecondary },
                        ]}
                      >
                        {st.charAt(0).toUpperCase() + st.slice(1)}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {itemShareType !== 'donate' && (
                  <>
                    <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Price</Text>
                    <TextInput
                      style={[styles.modalInput, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border }]}
                      placeholder="e.g., $15"
                      placeholderTextColor={colors.textTertiary}
                      value={itemPrice}
                      onChangeText={setItemPrice}
                      maxLength={20}
                    />
                  </>
                )}

                <View style={styles.modalActions}>
                  <Pressable style={[styles.modalCancelBtn, { borderColor: colors.border }]} onPress={() => setShowCreateItem(false)}>
                    <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.modalSubmitBtn, { backgroundColor: colors.primary }, createItemMut.isPending && { opacity: 0.6 }]}
                    onPress={handleCreateItem}
                    disabled={createItemMut.isPending}
                  >
                    {createItemMut.isPending ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.modalSubmitText}>Post Item</Text>
                    )}
                  </Pressable>
                </View>
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Create Request Modal */}
      <Modal visible={showCreateRequest} transparent animationType="fade" onRequestClose={() => setShowCreateRequest(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <Pressable style={styles.modalOverlay} onPress={() => setShowCreateRequest(false)}>
            <Pressable style={[styles.modalContent, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation?.()}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Request an Item</Text>

              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>What do you need? *</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border }]}
                placeholder="e.g., Graphing calculator"
                placeholderTextColor={colors.textTertiary}
                value={reqItem}
                onChangeText={setReqItem}
                maxLength={100}
              />

              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Description</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextarea, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border }]}
                placeholder="Add details about what you're looking for..."
                placeholderTextColor={colors.textTertiary}
                value={reqDesc}
                onChangeText={setReqDesc}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                maxLength={500}
              />

              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Urgency</Text>
              <View style={styles.shareTypeRow}>
                {(['low', 'normal', 'high'] as const).map((u) => (
                  <Pressable
                    key={u}
                    onPress={() => setReqUrgency(u)}
                    style={[
                      styles.shareTypeChip,
                      {
                        backgroundColor: reqUrgency === u ? colors.primary : colors.surfaceSecondary,
                        borderColor: reqUrgency === u ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.shareTypeText, { color: reqUrgency === u ? '#FFFFFF' : colors.textSecondary }]}>
                      {u.charAt(0).toUpperCase() + u.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.modalActions}>
                <Pressable style={[styles.modalCancelBtn, { borderColor: colors.border }]} onPress={() => setShowCreateRequest(false)}>
                  <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalSubmitBtn, { backgroundColor: colors.primary }, createReqMut.isPending && { opacity: 0.6 }]}
                  onPress={handleCreateRequest}
                  disabled={createReqMut.isPending}
                >
                  {createReqMut.isPending ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalSubmitText}>Post Request</Text>
                  )}
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    fontFamily: fontFamily.bold,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  tabLabel: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semiBold,
  },
  listContent: { padding: 16, gap: 12 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  itemImage: {
    width: '100%',
    height: 160,
  },
  cardBody: {
    padding: 14,
    gap: 6,
  },
  cardTitle: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.semiBold,
  },
  cardDesc: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    lineHeight: fontSize.base * 1.4,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  conditionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  conditionText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    textTransform: 'capitalize',
  },
  categoryText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
  },
  claimBtn: {
    marginTop: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  claimBtnText: {
    color: '#fff',
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semiBold,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bold,
  },
  emptySubtitle: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.regular,
    textAlign: 'center',
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  deleteBtnText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bold,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalLabel: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
    marginTop: 8,
    marginBottom: 4,
  },
  modalInput: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  modalTextarea: {
    minHeight: 80,
  },
  shareTypeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  shareTypeChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  shareTypeText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
  },
  modalSubmitBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubmitText: {
    color: '#FFFFFF',
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semiBold,
  },
});
