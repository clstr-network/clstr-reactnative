import React, { useState } from 'react';
import {
  View, Text, TextInput, FlatList, Pressable, StyleSheet,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { colors } from '@/constants/colors';
import { generateMockPeople, Person } from '@/lib/mock-data';

const allPeople = generateMockPeople(20);

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const results = query.length > 0
    ? allPeople.filter(p => p.fullName.toLowerCase().includes(query.toLowerCase()) ||
        p.department.toLowerCase().includes(query.toLowerCase()))
    : [];

  const recentSearches = ['React Native', 'Hackathon', 'Computer Science', 'Internship'];

  return (
    <View style={styles.screen}>
      <View style={[styles.headerBar, { paddingTop: insets.top + webTopInset }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={18} color={colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search people, posts, events..."
            placeholderTextColor={colors.textTertiary}
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
            </Pressable>
          )}
        </View>
      </View>

      {query.length === 0 ? (
        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>Recent Searches</Text>
          {recentSearches.map((term) => (
            <Pressable
              key={term}
              style={({ pressed }) => [styles.recentItem, pressed && { backgroundColor: colors.surfaceElevated }]}
              onPress={() => setQuery(term)}
            >
              <Ionicons name="time-outline" size={18} color={colors.textTertiary} />
              <Text style={styles.recentText}>{term}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.resultItem, pressed && { backgroundColor: colors.surfaceElevated }]}
            >
              <Avatar name={item.fullName} size={44} />
              <View style={styles.resultInfo}>
                <View style={styles.resultNameRow}>
                  <Text style={styles.resultName}>{item.fullName}</Text>
                  {item.role === 'alumni' && <Badge text="Alumni" variant="primary" />}
                </View>
                <Text style={styles.resultDepartment}>{item.department}</Text>
              </View>
            </Pressable>
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={48} color={colors.textTertiary} />
              <Text style={styles.emptyText}>No results found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  recentSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textSecondary,
    marginBottom: 12,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  recentText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.text,
  },
  listContent: {
    paddingBottom: 40,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resultInfo: {
    flex: 1,
  },
  resultNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resultName: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
  },
  resultDepartment: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    marginTop: 2,
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
