/**
 * ShareSheet — Phase 11.1
 * Bottom-sheet modal for sharing posts to connections or via native share.
 *
 * Two modes:
 * 1. Copy Link + native Share.share() (OS share sheet)
 * 2. Send to Connections: searchable connection list, multi-select, optional message, batch send
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  Share,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useThemeColors, radius } from '@/constants/colors';
import { fontFamily, fontSize } from '@/constants/typography';
import { Avatar } from '@/components/Avatar';
import { getConnections, sharePostToMultiple } from '@/lib/api/social';
import { useAuth } from '@/lib/auth-context';
import { QUERY_KEYS } from '@/lib/query-keys';

/* ─── Types ─── */

interface ConnectionProfile {
  id: string;
  full_name?: string;
  avatar_url?: string | null;
  role?: string;
}

interface ConnectionItem {
  id: string;
  requester_id: string;
  receiver_id: string;
  requester?: ConnectionProfile;
  receiver?: ConnectionProfile;
}

export interface ShareSheetProps {
  visible: boolean;
  onClose: () => void;
  /** The entity being shared */
  shareData: {
    type: 'post' | 'event' | 'job' | 'project' | 'profile';
    id: string;
    title?: string;
    previewText?: string;
    authorName?: string;
  };
}

const APP_URL = 'https://clstr.network';

function ShareSheet({ visible, onClose, shareData }: ShareSheetProps) {
  const colors = useThemeColors();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<'main' | 'connections'>('main');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');

  const entityUrl = `${APP_URL}/${shareData.type}/${shareData.id}`;
  const shareMessage = shareData.title
    ? `Check out "${shareData.title}" on Clstr: ${entityUrl}`
    : `Check out this ${shareData.type} on Clstr: ${entityUrl}`;

  /* ─── Reset state on close ─── */
  const handleClose = useCallback(() => {
    setMode('main');
    setSearch('');
    setSelectedIds(new Set());
    setMessage('');
    onClose();
  }, [onClose]);

  /* ─── Connections query ─── */
  const {
    data: connections,
    isLoading: connectionsLoading,
  } = useQuery({
    queryKey: ['connections', 'share-list'],
    queryFn: () => getConnections(),
    enabled: visible && mode === 'connections',
    staleTime: 60_000,
  });

  /* ─── Filter connections to exclude self, map to usable profiles ─── */
  const connectionProfiles = useMemo(() => {
    if (!connections || !user?.id) return [];
    return connections.map((conn: ConnectionItem) => {
      const profile =
        conn.requester_id === user.id ? conn.receiver : conn.requester;
      return profile ? { ...profile, connectionId: conn.id } : null;
    }).filter(Boolean) as (ConnectionProfile & { connectionId: string })[];
  }, [connections, user?.id]);

  const filteredProfiles = useMemo(() => {
    if (!search.trim()) return connectionProfiles;
    const q = search.toLowerCase();
    return connectionProfiles.filter((p) =>
      (p.full_name ?? '').toLowerCase().includes(q),
    );
  }, [connectionProfiles, search]);

  /* ─── Share to multiple mutation ─── */
  const shareMutation = useMutation({
    mutationFn: () => {
      if (shareData.type !== 'post') {
        // For non-post entities, we can't use sharePostToMultiple
        // Instead we'll use native share as fallback
        throw new Error('DM share only supported for posts');
      }
      return sharePostToMultiple(
        {
          original_post_id: shareData.id,
          content: message.trim() || undefined,
          receiver_ids: Array.from(selectedIds),
        },
        APP_URL,
      );
    },
    onSuccess: (result) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.feed });
      const count = (result as any)?.sent ?? selectedIds.size;
      Alert.alert('Sent!', `Shared with ${count} connection${count !== 1 ? 's' : ''}.`);
      handleClose();
    },
    onError: () => {
      Alert.alert('Error', 'Could not share. Please try again.');
    },
  });

  /* ─── Handlers ─── */

  const handleNativeShare = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: shareMessage,
        url: Platform.OS === 'ios' ? entityUrl : undefined,
      });
    } catch {
      // User cancelled
    }
    handleClose();
  }, [shareMessage, entityUrl, handleClose]);

  const handleCopyLink = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Clipboard.setStringAsync(entityUrl);
    Alert.alert('Copied', 'Link copied to clipboard.');
    handleClose();
  }, [entityUrl, handleClose]);

  const toggleSelection = useCallback((profileId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(profileId)) {
        next.delete(profileId);
      } else {
        next.add(profileId);
      }
      return next;
    });
  }, []);

  const handleSendToConnections = useCallback(() => {
    if (selectedIds.size === 0) {
      Alert.alert('No connections selected', 'Please select at least one connection.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    shareMutation.mutate();
  }, [selectedIds, shareMutation]);

  /* ─── Render Helpers ─── */

  const renderConnectionItem = useCallback(
    ({ item }: { item: ConnectionProfile & { connectionId: string } }) => {
      const isSelected = selectedIds.has(item.id);
      return (
        <Pressable
          onPress={() => toggleSelection(item.id)}
          style={({ pressed }) => [
            styles.connectionRow,
            pressed && { opacity: 0.7 },
            isSelected && { backgroundColor: colors.primaryLight },
          ]}
        >
          <Avatar uri={item.avatar_url} name={item.full_name} size="md" />
          <Text
            style={[styles.connectionName, { color: colors.text }]}
            numberOfLines={1}
          >
            {item.full_name ?? 'Unknown'}
          </Text>
          <Ionicons
            name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
            size={24}
            color={isSelected ? colors.primary : colors.textTertiary}
          />
        </Pressable>
      );
    },
    [selectedIds, colors, toggleSelection],
  );

  /* ─── Main mode actions ─── */
  const renderMainMode = () => (
    <>
      {/* Post preview card */}
      <View style={[styles.previewCard, { backgroundColor: colors.surfaceSecondary }]}>
        <Ionicons
          name={
            shareData.type === 'post' ? 'document-text-outline' :
            shareData.type === 'event' ? 'calendar-outline' :
            shareData.type === 'job' ? 'briefcase-outline' :
            shareData.type === 'project' ? 'code-slash-outline' :
            'person-outline'
          }
          size={20}
          color={colors.textSecondary}
        />
        <View style={styles.previewTextContainer}>
          {shareData.title ? (
            <Text style={[styles.previewTitle, { color: colors.text }]} numberOfLines={1}>
              {shareData.title}
            </Text>
          ) : null}
          {shareData.previewText ? (
            <Text style={[styles.previewSubtext, { color: colors.textSecondary }]} numberOfLines={2}>
              {shareData.previewText}
            </Text>
          ) : (
            <Text style={[styles.previewSubtext, { color: colors.textSecondary }]} numberOfLines={1}>
              {entityUrl}
            </Text>
          )}
        </View>
      </View>

      {/* Action: Copy Link */}
      <Pressable
        onPress={handleCopyLink}
        style={({ pressed }) => [
          styles.actionRow,
          pressed && { backgroundColor: colors.surfaceElevated ?? 'rgba(255,255,255,0.04)' },
        ]}
      >
        <View style={[styles.iconCircle, { backgroundColor: colors.primary + '20' }]}>
          <Ionicons name="copy-outline" size={20} color={colors.primary} />
        </View>
        <Text style={[styles.actionLabel, { color: colors.text }]}>Copy Link</Text>
      </Pressable>

      {/* Action: Native Share */}
      <Pressable
        onPress={handleNativeShare}
        style={({ pressed }) => [
          styles.actionRow,
          pressed && { backgroundColor: colors.surfaceElevated ?? 'rgba(255,255,255,0.04)' },
        ]}
      >
        <View style={[styles.iconCircle, { backgroundColor: colors.accent + '20' }]}>
          <Ionicons name="share-outline" size={20} color={colors.accent} />
        </View>
        <Text style={[styles.actionLabel, { color: colors.text }]}>Share via...</Text>
      </Pressable>

      {/* Action: Send to Connections (only for posts) */}
      {shareData.type === 'post' && (
        <Pressable
          onPress={() => setMode('connections')}
          style={({ pressed }) => [
            styles.actionRow,
            pressed && { backgroundColor: colors.surfaceElevated ?? 'rgba(255,255,255,0.04)' },
          ]}
        >
          <View style={[styles.iconCircle, { backgroundColor: colors.success + '20' }]}>
            <Ionicons name="paper-plane-outline" size={20} color={colors.success} />
          </View>
          <Text style={[styles.actionLabel, { color: colors.text }]}>
            Send to Connections
          </Text>
        </Pressable>
      )}
    </>
  );

  /* ─── Connections mode ─── */
  const renderConnectionsMode = () => (
    <View style={styles.connectionsModeContainer}>
      {/* Back + header */}
      <View style={styles.connectionsHeader}>
        <Pressable onPress={() => setMode('main')} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.connectionsTitle, { color: colors.text }]}>
          Send to Connections
        </Text>
        {selectedIds.size > 0 && (
          <View style={[styles.badge, { backgroundColor: colors.primary }]}>
            <Text style={styles.badgeText}>{selectedIds.size}</Text>
          </View>
        )}
      </View>

      {/* Search bar */}
      <View style={[styles.searchBar, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
        <Ionicons name="search" size={16} color={colors.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search connections..."
          placeholderTextColor={colors.textTertiary}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
          </Pressable>
        )}
      </View>

      {/* Connection list */}
      {connectionsLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading connections...
          </Text>
        </View>
      ) : filteredProfiles.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={36} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {search ? 'No connections found' : 'No connections yet'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredProfiles}
          keyExtractor={(item) => item.id}
          renderItem={renderConnectionItem}
          style={styles.connectionsList}
          contentContainerStyle={styles.connectionsListContent}
          keyboardShouldPersistTaps="handled"
        />
      )}

      {/* Optional message + send button */}
      {selectedIds.size > 0 && (
        <View style={[styles.sendSection, { borderTopColor: colors.border }]}>
          <TextInput
            style={[styles.messageInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceSecondary }]}
            placeholder="Add a message (optional)"
            placeholderTextColor={colors.textTertiary}
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={500}
          />
          <Pressable
            onPress={handleSendToConnections}
            disabled={shareMutation.isPending}
            style={({ pressed }) => [
              styles.sendButton,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.85 },
              shareMutation.isPending && { opacity: 0.6 },
            ]}
          >
            {shareMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.sendButtonText}>
                Send to {selectedIds.size} connection{selectedIds.size !== 1 ? 's' : ''}
              </Text>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable
          style={[
            styles.sheet,
            { backgroundColor: colors.surface },
            mode === 'connections' && styles.sheetTall,
          ]}
          onPress={() => {}} // prevent close when tapping inside sheet
        >
          {/* Handle bar */}
          <View style={[styles.handleBar, { backgroundColor: colors.textTertiary }]} />

          {mode === 'main' ? renderMainMode() : renderConnectionsMode()}

          {/* Cancel button (main mode only) */}
          {mode === 'main' && (
            <Pressable
              onPress={handleClose}
              style={({ pressed }) => [
                styles.cancelButton,
                { borderTopColor: colors.border },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </Pressable>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default React.memo(ShareSheet);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingBottom: 34,
    paddingHorizontal: 8,
    maxHeight: '60%',
  },
  sheetTall: {
    maxHeight: '85%',
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 8,
    marginBottom: 12,
    padding: 12,
    borderRadius: radius.md,
  },
  previewTextContainer: {
    flex: 1,
    gap: 2,
  },
  previewTitle: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.semiBold,
  },
  previewSubtext: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: radius.md,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    fontFamily: fontFamily.semiBold,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 4,
    borderTopWidth: 1,
  },
  cancelText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    fontFamily: fontFamily.semiBold,
  },
  /* ─── Connections mode ─── */
  connectionsModeContainer: {
    flex: 1,
    minHeight: 300,
  },
  connectionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 8,
    paddingBottom: 10,
  },
  connectionsTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bold,
    flex: 1,
  },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bold,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.body,
    fontFamily: fontFamily.regular,
    paddingVertical: 0,
  },
  connectionsList: {
    flex: 1,
  },
  connectionsListContent: {
    paddingBottom: 8,
  },
  connectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  connectionName: {
    flex: 1,
    fontSize: fontSize.body,
    fontFamily: fontFamily.medium,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  loadingText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.regular,
  },
  sendSection: {
    borderTopWidth: 1,
    paddingTop: 10,
    paddingHorizontal: 8,
    gap: 8,
  },
  messageInput: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.regular,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxHeight: 80,
  },
  sendButton: {
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: fontSize.body,
    fontFamily: fontFamily.bold,
  },
});
