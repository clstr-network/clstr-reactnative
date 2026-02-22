import React from 'react';
import { FlatList, StyleSheet, View, Text, Platform, Pressable, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { Avatar } from '@/components/Avatar';
import { PostCard } from '@/components/PostCard';
import { POSTS, CURRENT_USER } from '@/lib/mock-data';
import type { Post } from '@/lib/mock-data';

export default function FeedScreen() {
  const c = Colors.colors;
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const renderItem = ({ item }: { item: Post }) => <PostCard post={item} />;
  const keyExtractor = (item: Post) => item.id;

  const ListHeader = () => (
    <View>
      <View style={[styles.composeRow, { borderBottomColor: c.border }]}>
        <Avatar name={CURRENT_USER.name} size={38} />
        <View style={[styles.composeInput, { backgroundColor: c.backgroundTertiary, borderColor: c.border }]}>
          <Text style={[styles.composePlaceholder, { color: c.textTertiary }]}>
            Share something with your network...
          </Text>
        </View>
      </View>
      <View style={[styles.mediaRow, { borderBottomColor: c.border }]}>
        <Pressable style={styles.mediaBtn}>
          <Ionicons name="image-outline" size={18} color={c.primary} />
          <Text style={[styles.mediaBtnText, { color: c.textSecondary }]}>Photo</Text>
        </Pressable>
        <Pressable style={styles.mediaBtn}>
          <Ionicons name="videocam-outline" size={18} color={c.textTertiary} />
          <Text style={[styles.mediaBtnText, { color: c.textTertiary }]}>Video</Text>
        </Pressable>
        <Pressable style={styles.mediaBtn}>
          <Ionicons name="document-outline" size={18} color={c.textTertiary} />
          <Text style={[styles.mediaBtnText, { color: c.textTertiary }]}>Document</Text>
        </Pressable>
      </View>
      <View style={[styles.sortRow, { borderBottomColor: c.border }]}>
        <Text style={[styles.sortLabel, { color: c.textTertiary }]}>Sort by:</Text>
        <Pressable style={styles.sortBtn}>
          <Text style={[styles.sortValue, { color: c.text }]}>Recent</Text>
          <Ionicons name="chevron-down" size={14} color={c.text} />
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <View style={[styles.topBar, { paddingTop: (Platform.OS === 'web' ? webTopInset : insets.top) + 4 }]}>
        <Pressable style={styles.menuBtn}>
          <Ionicons name="menu" size={24} color={c.text} />
        </Pressable>
        <View style={[styles.searchBar, { backgroundColor: c.backgroundTertiary, borderColor: c.border }]}>
          <Ionicons name="search-outline" size={16} color={c.textTertiary} />
          <Text style={[styles.searchPlaceholder, { color: c.textTertiary }]}>Search...</Text>
        </View>
        <Avatar name={CURRENT_USER.name} size={32} />
      </View>
      <FlatList
        data={POSTS}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={[styles.list, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 10,
  },
  menuBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    gap: 6,
  },
  searchPlaceholder: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  composeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  composeInput: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  composePlaceholder: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  mediaRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 24,
  },
  mediaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  mediaBtnText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  sortRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 6,
  },
  sortLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  sortValue: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  list: {},
});
