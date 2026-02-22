import React, { useState, useMemo } from 'react';
import { FlatList, StyleSheet, View, Text, TextInput, Platform, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { Avatar } from '@/components/Avatar';
import { ConversationItem } from '@/components/ConversationItem';
import { CONVERSATIONS, USERS, CURRENT_USER } from '@/lib/mock-data';
import type { Conversation, User } from '@/lib/mock-data';

type Tab = 'chats' | 'contacts';

export default function MessagesScreen() {
  const c = Colors.colors;
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('chats');

  const contacts = useMemo(() => USERS.filter(u => u.connectionStatus === 'connected'), []);

  const filteredConvos = search.trim()
    ? CONVERSATIONS.filter(conv => conv.partner.name.toLowerCase().includes(search.toLowerCase()))
    : CONVERSATIONS;

  const filteredContacts = search.trim()
    ? contacts.filter(u => u.name.toLowerCase().includes(search.toLowerCase()))
    : contacts;

  const renderConvo = ({ item }: { item: Conversation }) => (
    <ConversationItem
      conversation={item}
      onPress={() => router.push({ pathname: '/chat/[id]', params: { id: item.id } })}
    />
  );

  const renderContact = ({ item }: { item: User }) => (
    <Pressable style={[styles.contactItem, { borderBottomColor: c.border }]}>
      <Avatar name={item.name} size={46} />
      <View style={styles.contactInfo}>
        <Text style={[styles.contactName, { color: c.text }]} numberOfLines={1}>{item.name}</Text>
        <Text style={[styles.contactRole, { color: c.textTertiary }]} numberOfLines={1}>{item.role}</Text>
      </View>
    </Pressable>
  );

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
        <Text style={[styles.title, { color: c.text }]}>Messages</Text>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: c.inputBg, borderColor: c.inputBorder }]}>
        <Ionicons name="search-outline" size={16} color={c.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: c.text }]}
          placeholder="Search conversations..."
          placeholderTextColor={c.textTertiary}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
        />
      </View>

      <View style={[styles.tabRow, { borderBottomColor: c.border }]}>
        <Pressable
          style={[styles.tab, activeTab === 'chats' && { borderBottomColor: c.primary, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('chats')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'chats' ? c.text : c.textTertiary }]}>
            Chats
          </Text>
          <View style={[styles.tabCount, { backgroundColor: activeTab === 'chats' ? c.primary + '30' : c.backgroundTertiary }]}>
            <Text style={[styles.tabCountText, { color: activeTab === 'chats' ? c.primary : c.textTertiary }]}>
              {CONVERSATIONS.length}
            </Text>
          </View>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'contacts' && { borderBottomColor: c.primary, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('contacts')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'contacts' ? c.text : c.textTertiary }]}>
            Contacts
          </Text>
          <View style={[styles.tabCount, { backgroundColor: activeTab === 'contacts' ? c.primary + '30' : c.backgroundTertiary }]}>
            <Text style={[styles.tabCountText, { color: activeTab === 'contacts' ? c.primary : c.textTertiary }]}>
              {contacts.length}
            </Text>
          </View>
        </Pressable>
      </View>

      {activeTab === 'chats' ? (
        <FlatList
          data={filteredConvos}
          renderItem={renderConvo}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={40} color={c.textTertiary} />
              <Text style={[styles.emptyTitle, { color: c.textSecondary }]}>No conversations yet</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={filteredContacts}
          renderItem={renderContact}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={40} color={c.textTertiary} />
              <Text style={[styles.emptyTitle, { color: c.textSecondary }]}>No contacts found</Text>
            </View>
          }
        />
      )}
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
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginRight: 8,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },
  tabCount: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  tabCountText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
  },
  list: {},
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  contactInfo: {
    flex: 1,
    marginLeft: 12,
  },
  contactName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  contactRole: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 8,
  },
  emptyTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
  },
});
