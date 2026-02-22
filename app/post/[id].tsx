import React from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useData } from "@/lib/data-context";
import Colors from "@/constants/colors";
import { formatDistanceToNow } from "date-fns";

function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2);
  const colors = ["#6C5CE7", "#00CEC9", "#FF6B6B", "#FDCB6E", "#00B894", "#A29BFE"];
  const colorIndex = name.length % colors.length;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors[colorIndex], alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: size * 0.38 }}>{initials}</Text>
    </View>
  );
}

export default function PostDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { posts, toggleLike } = useData();

  const post = posts.find(p => p.id === id);

  if (!post) {
    return (
      <View style={[styles.container, { paddingTop: Platform.OS === "web" ? 67 : insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Post</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Post not found</Text>
        </View>
      </View>
    );
  }

  const timeAgo = formatDistanceToNow(new Date(post.timestamp), { addSuffix: true });

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top }]}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Post</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.postHeader}>
          <Avatar name={post.userName} />
          <View style={styles.postHeaderText}>
            <Text style={styles.postUserName}>{post.userName}</Text>
            <Text style={styles.postUserRole}>{post.userRole}</Text>
          </View>
        </View>

        <Text style={styles.postContent}>{post.content}</Text>
        <Text style={styles.postTime}>{timeAgo}</Text>

        <View style={styles.divider} />

        <View style={styles.postStats}>
          <Text style={styles.statText}>{post.likes} likes</Text>
          <Text style={styles.statText}>{post.comments} comments</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.postActions}>
          <Pressable
            style={styles.actionBtn}
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              toggleLike(post.id);
            }}
          >
            <Ionicons
              name={post.liked ? "heart" : "heart-outline"}
              size={22}
              color={post.liked ? Colors.dark.error : Colors.dark.textSecondary}
            />
            <Text style={[styles.actionText, post.liked && { color: Colors.dark.error }]}>Like</Text>
          </Pressable>
          <Pressable style={styles.actionBtn}>
            <Ionicons name="chatbubble-outline" size={20} color={Colors.dark.textSecondary} />
            <Text style={styles.actionText}>Comment</Text>
          </Pressable>
          <Pressable style={styles.actionBtn}>
            <Ionicons name="share-outline" size={20} color={Colors.dark.textSecondary} />
            <Text style={styles.actionText}>Share</Text>
          </Pressable>
        </View>
      </ScrollView>
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
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.dark.border,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.text,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  postHeaderText: {
    marginLeft: 12,
  },
  postUserName: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.text,
  },
  postUserRole: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },
  postContent: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.text,
    lineHeight: 24,
  },
  postTime: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textTertiary,
    marginTop: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.dark.border,
    marginVertical: 16,
  },
  postStats: {
    flexDirection: "row",
    gap: 20,
  },
  statText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.textSecondary,
  },
  postActions: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
  },
  actionText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.textSecondary,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.text,
  },
});
