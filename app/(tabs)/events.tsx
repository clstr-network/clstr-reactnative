import React from 'react';
import { FlatList, StyleSheet, View, Text, Platform, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { Avatar } from '@/components/Avatar';
import { EventCard } from '@/components/EventCard';
import { EVENTS, CURRENT_USER } from '@/lib/mock-data';
import type { Event } from '@/lib/mock-data';

export default function EventsScreen() {
  const c = Colors.colors;
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const renderItem = ({ item }: { item: Event }) => <EventCard event={item} />;

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

      <View style={styles.header}>
        <Text style={[styles.title, { color: c.text }]}>Events</Text>
        <Text style={[styles.subtitle, { color: c.textSecondary }]}>
          {EVENTS.length} upcoming events
        </Text>
      </View>
      <FlatList
        data={EVENTS}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
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
  list: {
    paddingTop: 4,
  },
});
