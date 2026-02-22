import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet,
  Platform, RefreshControl, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { colors } from '@/constants/colors';
import { Person, generateMockPeople } from '@/lib/mock-data';

type FilterType = 'all' | 'students' | 'alumni' | 'connected';

function PersonCard({ person, onConnect }: { person: Person; onConnect: (id: string) => void }) {
  return (
    <View style={styles.personCard}>
      <Avatar name={person.fullName} size={48} />
      <View style={styles.personInfo}>
        <View style={styles.personNameRow}>
          <Text style={styles.personName}>{person.fullName}</Text>
          {person.role === 'alumni' && <Badge text="Alumni" variant="primary" />}
        </View>
        <Text style={styles.personDepartment}>{person.department} {'\u00B7'} {person.graduationYear}</Text>
        {person.mutualConnections > 0 && (
          <Text style={styles.mutualText}>{person.mutualConnections} mutual connections</Text>
        )}
      </View>
      {person.connectionStatus === 'connected' ? (
        <View style={styles.connectedBadge}>
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
        </View>
      ) : person.connectionStatus === 'pending' ? (
        <View style={styles.pendingButton}>
          <Text style={styles.pendingText}>Pending</Text>
        </View>
      ) : (
        <Pressable
          style={({ pressed }) => [styles.connectButton, pressed && { opacity: 0.8 }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onConnect(person.id);
          }}
        >
          <Ionicons name="person-add-outline" size={16} color={colors.primary} />
        </Pressable>
      )}
    </View>
  );
}

export default function NetworkScreen() {
  const insets = useSafeAreaInsets();
  const [people, setPeople] = useState<Person[]>(() => generateMockPeople(20));
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const filteredPeople = people.filter(p => {
    if (filter === 'students' && p.role !== 'student') return false;
    if (filter === 'alumni' && p.role !== 'alumni') return false;
    if (filter === 'connected' && p.connectionStatus !== 'connected') return false;
    if (searchQuery && !p.fullName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleConnect = useCallback((id: string) => {
    setPeople(prev => prev.map(p =>
      p.id === id ? { ...p, connectionStatus: 'pending' as const } : p
    ));
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setPeople(generateMockPeople(20));
      setRefreshing(false);
    }, 1000);
  }, []);

  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'students', label: 'Students' },
    { key: 'alumni', label: 'Alumni' },
    { key: 'connected', label: 'Connected' },
  ];

  return (
    <View style={styles.screen}>
      <View style={[styles.headerBar, { paddingTop: insets.top + webTopInset }]}>
        <Text style={styles.headerTitle}>Network</Text>
        <Text style={styles.headerSubtitle}>{people.filter(p => p.connectionStatus === 'connected').length} connections</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color={colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search people..."
          placeholderTextColor={colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.filterRow}>
        {filters.map(f => (
          <Pressable
            key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filteredPeople}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PersonCard person={item} onConnect={handleConnect} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={colors.textTertiary} />
            <Text style={styles.emptyText}>No people found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBar: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.inputBackground,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.text,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: colors.primary,
  },
  listContent: {
    paddingBottom: 100,
  },
  personCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  personInfo: {
    flex: 1,
  },
  personNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  personName: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
  },
  personDepartment: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    marginTop: 2,
  },
  mutualText: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: colors.textTertiary,
    marginTop: 2,
  },
  connectButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pendingText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: colors.textSecondary,
  },
  connectedBadge: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: colors.textTertiary,
  },
});
