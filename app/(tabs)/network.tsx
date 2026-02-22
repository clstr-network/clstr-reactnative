import React, { useState, useMemo } from 'react';
import { FlatList, StyleSheet, View, Text, TextInput, Platform, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { Avatar } from '@/components/Avatar';
import { UserCard } from '@/components/UserCard';
import { USERS, CURRENT_USER } from '@/lib/mock-data';
import type { User } from '@/lib/mock-data';

type Tab = 'discover' | 'requests' | 'connections';

export default function NetworkScreen() {
  const c = Colors.colors;
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('discover');

  const discover = useMemo(() => USERS.filter(u => u.connectionStatus === 'none'), []);
  const requests = useMemo(() => USERS.filter(u => u.connectionStatus === 'pending'), []);
  const connections = useMemo(() => USERS.filter(u => u.connectionStatus === 'connected'), []);

  const currentList = activeTab === 'discover' ? discover : activeTab === 'requests' ? requests : connections;

  const filtered = search.trim()
    ? currentList.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.role.toLowerCase().includes(search.toLowerCase()))
    : currentList;

  const renderItem = ({ item }: { item: User }) => (
    <UserCard user={item} />
  );

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'discover', label: 'Discover', count: discover.length },
    { key: 'requests', label: 'Requests', count: requests.length },
    { key: 'connections', label: 'Connections', count: connections.length },
  ];

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <View style={[styles.topBar, { paddingTop: (Platform.OS === 'web' ? webTopInset : insets.top) + 4 }]}>
        <Pressable style={styles.menuBtn}>
          <Ionicons name="menu" size={24} color={c.text} />
        </Pressable>
        <View style={[styles.searchBarTop, { backgroundColor: c.backgroundTertiary, borderColor: c.border }]}>
          <Ionicons name="search-outline" size={16} color={c.textTertiary} />
          <Text style={[styles.searchPlaceholder, { color: c.textTertiary }]}>Search...</Text>
        </View>
        <Avatar name={CURRENT_USER.name} size={32} />
      </View>

      <View style={styles.header}>
        <Text style={[styles.title, { color: c.text }]}>My Network</Text>
        <Text style={[styles.subtitle, { color: c.textSecondary }]}>
          Connect with students, alumni, and faculty
        </Text>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: c.inputBg, borderColor: c.inputBorder }]}>
        <Ionicons name="search-outline" size={16} color={c.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: c.text }]}
          placeholder="Search by name, role, or branch..."
          placeholderTextColor={c.textTertiary}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
        />
        <View style={styles.filterBtns}>
          <Pressable style={styles.filterBtn}>
            <Ionicons name="options-outline" size={16} color={c.textTertiary} />
          </Pressable>
        </View>
      </View>

      <View style={[styles.tabRow, { borderBottomColor: c.border }]}>
        {tabs.map(tab => (
          <Pressable
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && { borderBottomColor: c.primary, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, { color: activeTab === tab.key ? c.text : c.textTertiary }]}>
              {tab.label}
            </Text>
            <View style={[styles.tabCount, { backgroundColor: activeTab === tab.key ? c.primary + '30' : c.backgroundTertiary }]}>
              <Text style={[styles.tabCountText, { color: activeTab === tab.key ? c.primary : c.textTertiary }]}>
                {tab.count}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={40} color={c.textTertiary} />
            <Text style={[styles.emptyText, { color: c.textSecondary }]}>No users found</Text>
          </View>
        }
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
  searchBarTop: {
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
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginTop: 3,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    height: '100%',
  },
  filterBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  filterBtn: {
    padding: 4,
  },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    borderBottomWidth: 1,
    marginBottom: 12,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginRight: 8,
    gap: 5,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  tabCount: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  tabCountText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
  },
  list: {
    paddingTop: 2,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
  },
});
