import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import Colors, { surfaceTiers, categoryColors } from '@/constants/colors';
import type { Event } from '@/lib/mock-data';

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  const c = Colors.colors;
  const [registered, setRegistered] = useState(event.isRegistered);
  const catColor = categoryColors[event.category] || c.primary;

  const handleRegister = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRegistered(!registered);
  };

  return (
    <View style={[styles.card, surfaceTiers.tier2]}>
      <View style={[styles.dateStrip, { backgroundColor: catColor + '12' }]}>
        <Text style={[styles.dateDay, { color: catColor }]}>{format(event.date, 'd')}</Text>
        <Text style={[styles.dateMonth, { color: catColor }]}>{format(event.date, 'MMM')}</Text>
      </View>
      <View style={styles.content}>
        <View style={[styles.categoryBadge, { backgroundColor: catColor + '15' }]}>
          <Text style={[styles.categoryText, { color: catColor }]}>{event.category}</Text>
        </View>
        <Text style={[styles.title, { color: c.text }]} numberOfLines={2}>{event.title}</Text>
        <Text style={[styles.description, { color: c.textSecondary }]} numberOfLines={2}>
          {event.description}
        </Text>
        <View style={styles.details}>
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={13} color={c.textTertiary} />
            <Text style={[styles.detailText, { color: c.textTertiary }]}>{event.location}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="people-outline" size={13} color={c.textTertiary} />
            <Text style={[styles.detailText, { color: c.textTertiary }]}>{event.attendees} attending</Text>
          </View>
        </View>
        <Pressable
          style={[styles.registerBtn, {
            borderColor: registered ? c.success : c.primary,
          }]}
          onPress={handleRegister}
        >
          <Ionicons
            name={registered ? 'checkmark-circle' : 'add-circle-outline'}
            size={15}
            color={registered ? c.success : c.primary}
          />
          <Text style={[styles.registerText, {
            color: registered ? c.success : c.primary,
          }]}>
            {registered ? 'Registered' : 'Register'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  dateStrip: {
    width: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  dateDay: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
  },
  dateMonth: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  content: {
    flex: 1,
    padding: 12,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 4,
  },
  categoryText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
  },
  title: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    marginBottom: 3,
  },
  description: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 6,
  },
  details: {
    gap: 3,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
  },
  registerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1.5,
    paddingVertical: 7,
    gap: 4,
  },
  registerText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
});
