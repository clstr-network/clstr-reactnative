import React, { useState, useCallback, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Pressable,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useData, type Connection } from "@/lib/data-context";
import Colors from "@/constants/colors";

function Avatar({ name, size = 48 }: { name: string; size?: number }) {
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2);
  const colors = ["#6C5CE7", "#00CEC9", "#FF6B6B", "#FDCB6E", "#00B894", "#A29BFE"];
  const colorIndex = name.length % colors.length;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors[colorIndex], alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: size * 0.38 }}>{initials}</Text>
    </View>
  );
}

type Tab = "People" | "Requests";

const ConnectionCard = React.memo(function ConnectionCard({
  item,
  onConnect,
  onAccept,
}: {
  item: Connection;
  onConnect: () => void;
  onAccept: () => void;
}) {
  return (
    <View style={styles.card}>
      <Avatar name={item.name} />
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{item.name}</Text>
        <Text style={styles.cardRole}>{item.role}</Text>
        <Text style={styles.cardDept}>{item.department}</Text>
      </View>
      {item.status === "none" && (
        <Pressable
          style={styles.connectBtn}
          hitSlop={4}
          onPress={() => {
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onConnect();
          }}
        >
          <Ionicons name="person-add-outline" size={16} color={Colors.dark.primary} />
          <Text style={styles.connectBtnText}>Connect</Text>
        </Pressable>
      )}
      {item.status === "pending" && (
        <View style={styles.pendingBadge}>
          <Text style={styles.pendingText}>Pending</Text>
        </View>
      )}
      {item.status === "connected" && (
        <View style={styles.connectedBadge}>
          <Ionicons name="checkmark-circle" size={16} color={Colors.dark.success} />
          <Text style={styles.connectedText}>Connected</Text>
        </View>
      )}
    </View>
  );
}, (prev, next) => prev.item.id === next.item.id && prev.item.status === next.item.status);

const RequestCard = React.memo(function RequestCard({
  item,
  onAccept,
}: {
  item: Connection;
  onAccept: () => void;
}) {
  return (
    <View style={styles.card}>
      <Avatar name={item.name} />
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{item.name}</Text>
        <Text style={styles.cardRole}>{item.role}</Text>
      </View>
      <View style={styles.requestActions}>
        <Pressable
          style={styles.acceptBtn}
          hitSlop={4}
          onPress={() => {
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onAccept();
          }}
        >
          <Text style={styles.acceptBtnText}>Accept</Text>
        </Pressable>
      </View>
    </View>
  );
}, (prev, next) => prev.item.id === next.item.id && prev.item.status === next.item.status);

export default function NetworkScreen() {
  const insets = useSafeAreaInsets();
  const { connections, sendConnectionRequest, acceptConnection, isLoading } = useData();
  const [activeTab, setActiveTab] = useState<Tab>("People");
  const [refreshing, setRefreshing] = useState(false);

  const people = useMemo(() =>
    connections.filter(c => c.status !== "pending"),
    [connections]
  );

  const requests = useMemo(() =>
    connections.filter(c => c.status === "pending"),
    [connections]
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleConnect = useCallback((id: string) => {
    sendConnectionRequest(id);
  }, [sendConnectionRequest]);

  const handleAccept = useCallback((id: string) => {
    acceptConnection(id);
  }, [acceptConnection]);

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
        <Text style={styles.headerTitle}>Network</Text>
      </View>

      <View style={styles.tabRow}>
        {(["People", "Requests"] as Tab[]).map(tab => (
          <Pressable
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab}
              {tab === "Requests" && requests.length > 0 ? ` (${requests.length})` : ""}
            </Text>
          </Pressable>
        ))}
      </View>

      {activeTab === "People" ? (
        <FlatList
          data={people}
          renderItem={({ item }) => (
            <ConnectionCard
              item={item}
              onConnect={() => handleConnect(item.id)}
              onAccept={() => handleAccept(item.id)}
            />
          )}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!!people.length}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.dark.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color={Colors.dark.textTertiary} />
              <Text style={styles.emptyTitle}>No people found</Text>
              <Text style={styles.emptySubtitle}>Check back later for new connections</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={requests}
          renderItem={({ item }) => (
            <RequestCard item={item} onAccept={() => handleAccept(item.id)} />
          )}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!!requests.length}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.dark.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="mail-outline" size={48} color={Colors.dark.textTertiary} />
              <Text style={styles.emptyTitle}>No pending requests</Text>
              <Text style={styles.emptySubtitle}>You have no incoming connection requests</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.dark.text,
  },
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.dark.surfaceElevated,
    minHeight: 44,
    justifyContent: "center",
  },
  tabActive: {
    backgroundColor: Colors.dark.primary,
  },
  tabText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.textSecondary,
  },
  tabTextActive: {
    color: "#fff",
  },
  listContent: {
    paddingBottom: 100,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.dark.border,
  },
  cardInfo: {
    flex: 1,
    marginLeft: 14,
  },
  cardName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.text,
  },
  cardRole: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },
  cardDept: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textTertiary,
    marginTop: 1,
  },
  connectBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.dark.primary,
    minHeight: 44,
  },
  connectBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.primary,
  },
  pendingBadge: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.dark.surfaceElevated,
    minHeight: 44,
    justifyContent: "center",
  },
  pendingText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.textTertiary,
  },
  connectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 10,
    minHeight: 44,
  },
  connectedText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.success,
  },
  requestActions: {
    flexDirection: "row",
    gap: 8,
  },
  acceptBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.dark.primary,
    minHeight: 44,
    justifyContent: "center",
  },
  acceptBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
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
