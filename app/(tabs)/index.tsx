import React, { useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useData, type Post } from "@/lib/data-context";
import Colors from "@/constants/colors";
import { formatDistanceToNow } from "date-fns";

function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2);
  const colors = ["#6C5CE7", "#00CEC9", "#FF6B6B", "#FDCB6E", "#00B894", "#A29BFE"];
  const colorIndex = name.length % colors.length;
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors[colorIndex] }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.38 }]}>{initials}</Text>
    </View>
  );
}

const PostCard = React.memo(function PostCard({ post, onLike }: { post: Post; onLike: () => void }) {
  const timeAgo = formatDistanceToNow(new Date(post.timestamp), { addSuffix: true });

  return (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <Avatar name={post.userName} />
        <View style={styles.postHeaderText}>
          <Text style={styles.postUserName}>{post.userName}</Text>
          <Text style={styles.postUserRole}>{post.userRole}</Text>
        </View>
        <Text style={styles.postTime}>{timeAgo}</Text>
      </View>
      <Text style={styles.postContent}>{post.content}</Text>
      <View style={styles.postActions}>
        <Pressable
          style={styles.postAction}
          hitSlop={8}
          onPress={() => {
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onLike();
          }}
        >
          <Ionicons
            name={post.liked ? "heart" : "heart-outline"}
            size={20}
            color={post.liked ? Colors.dark.error : Colors.dark.textSecondary}
          />
          <Text style={[styles.postActionText, post.liked && { color: Colors.dark.error }]}>{post.likes}</Text>
        </Pressable>
        <Pressable style={styles.postAction} hitSlop={8} onPress={() => router.push({ pathname: "/post/[id]", params: { id: post.id } })}>
          <Ionicons name="chatbubble-outline" size={18} color={Colors.dark.textSecondary} />
          <Text style={styles.postActionText}>{post.comments}</Text>
        </Pressable>
        <Pressable style={styles.postAction} hitSlop={8}>
          <Ionicons name="share-outline" size={18} color={Colors.dark.textSecondary} />
        </Pressable>
      </View>
    </View>
  );
}, (prev, next) =>
  prev.post.id === next.post.id &&
  prev.post.liked === next.post.liked &&
  prev.post.likes === next.post.likes &&
  prev.post.comments === next.post.comments
);

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const { posts, toggleLike, isLoading } = useData();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleLike = useCallback((id: string) => {
    toggleLike(id);
  }, [toggleLike]);

  const renderPost = useCallback(({ item }: { item: Post }) => (
    <PostCard post={item} onLike={() => handleLike(item.id)} />
  ), [handleLike]);

  const keyExtractor = useCallback((item: Post) => item.id, []);

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: Platform.OS === "web" ? 67 : insets.top }]}>
        <ActivityIndicator size="large" color={Colors.dark.primary} style={{ marginTop: 40 }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top }]}>
        <Text style={styles.headerTitle}>Feed</Text>
        <View style={styles.headerActions}>
          <Pressable onPress={() => router.push("/new-post")} style={styles.headerBtn} hitSlop={8}>
            <Ionicons name="add-circle-outline" size={26} color={Colors.dark.text} />
          </Pressable>
        </View>
      </View>
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!posts.length}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.dark.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="newspaper-outline" size={48} color={Colors.dark.textTertiary} />
            <Text style={styles.emptyTitle}>No posts yet</Text>
            <Text style={styles.emptySubtitle}>Be the first to share something</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.dark.border,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.dark.text,
  },
  headerActions: {
    flexDirection: "row",
    gap: 16,
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingBottom: 100,
  },
  postCard: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.dark.border,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatar: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
  },
  postHeaderText: {
    flex: 1,
    marginLeft: 12,
  },
  postUserName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.text,
  },
  postUserRole: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary,
    marginTop: 1,
  },
  postTime: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textTertiary,
  },
  postContent: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.text,
    lineHeight: 22,
    marginBottom: 12,
  },
  postActions: {
    flexDirection: "row",
    gap: 24,
  },
  postAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 44,
    paddingVertical: 4,
  },
  postActionText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.textSecondary,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.text,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary,
  },
});
