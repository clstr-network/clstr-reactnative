/**
 * MagicLinkSentScreen — Confirmation after requesting a magic link (OTP).
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/constants/colors';

export default function MagicLinkSentScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ email?: string }>();

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 40) }]}>
      <View style={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: colors.tint + '15' }]}>
          <Ionicons name="sparkles-outline" size={44} color={colors.tint} />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>Check your inbox</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          We sent a magic sign-in link to{'\n'}
          <Text style={{ fontFamily: 'Inter_600SemiBold' }}>{params.email ?? 'your email'}</Text>
        </Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          Click the link in the email to sign in instantly — no password needed.
        </Text>

        <Pressable
          style={[styles.primaryButton, { backgroundColor: colors.tint }]}
          onPress={() => router.replace('/(auth)/login')}
        >
          <Text style={styles.primaryButtonText}>Back to Sign In</Text>
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={() => router.back()}
        >
          <Text style={[styles.secondaryButtonText, { color: colors.tint }]}>
            Try a different email
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingBottom: 80 },
  iconCircle: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  title: { fontSize: 24, fontFamily: 'Inter_700Bold' },
  subtitle: { fontSize: 15, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 22 },
  body: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 20, paddingHorizontal: 16 },
  primaryButton: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', width: '100%', marginTop: 12 },
  primaryButtonText: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: '#FFFFFF' },
  secondaryButton: { paddingVertical: 12, alignItems: 'center' },
  secondaryButtonText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
});
