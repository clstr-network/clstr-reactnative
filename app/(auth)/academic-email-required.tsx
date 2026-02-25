/**
 * AcademicEmailRequired — Shown when a non-educational email is detected
 * during the auth callback.
 *
 * Mirrors the web's `src/pages/AcademicEmailRequired.tsx`.
 * Pure black (#000000) background matching the auth theme.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/adapters/core-client';
import { fontFamily, fontSize } from '@/constants/typography';

export default function AcademicEmailRequiredScreen() {
  const [isSigningOut, setIsSigningOut] = useState(false);

  const signOutAndGo = async (path: '/(auth)/signup' | '/(auth)/login') => {
    setIsSigningOut(true);
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore — best-effort sign-out before redirect
    } finally {
      router.replace(path);
      setIsSigningOut(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.brand}>Clstr</Text>
          <Text style={styles.heading}>Academic Email Required</Text>
          <Text style={styles.subtitle}>
            This network is only for verified students and alumni.
          </Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          {/* Why am I seeing this? */}
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Why am I seeing this?</Text>
            <Text style={styles.cardDescription}>
              You tried to sign in with a non-academic email address.
            </Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.explanation}>
            Please sign up or log in using your college/university email
            (examples:{' '}
            <Text style={styles.domainHighlight}>.edu</Text>,{' '}
            <Text style={styles.domainHighlight}>.edu.in</Text>,{' '}
            <Text style={styles.domainHighlight}>.ac.in</Text>).
          </Text>

          <View style={styles.divider} />

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => signOutAndGo('/(auth)/signup')}
              disabled={isSigningOut}
              activeOpacity={0.7}
            >
              {isSigningOut ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Use College Email</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.outlineButton}
              onPress={() => signOutAndGo('/(auth)/login')}
              disabled={isSigningOut}
              activeOpacity={0.7}
            >
              <Text style={styles.outlineButtonText}>Go to Login</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.ghostButton}
              onPress={() => router.replace('/')}
              disabled={isSigningOut}
              activeOpacity={0.7}
            >
              <Text style={styles.ghostButtonText}>Back to Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  brand: {
    fontSize: fontSize.xl,
    fontFamily: fontFamily.semiBold,
    color: 'rgba(255,255,255,0.80)',
    letterSpacing: 1,
  },
  heading: {
    fontSize: 26,
    fontFamily: fontFamily.bold,
    color: '#FFFFFF',
    marginTop: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.regular,
    color: 'rgba(255,255,255,0.70)',
    marginTop: 8,
    textAlign: 'center',
  },

  // Card
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 16,
    padding: 24,
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: fontSize.xl,
    fontFamily: fontFamily.semiBold,
    color: '#FFFFFF',
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    color: 'rgba(255,255,255,0.70)',
    textAlign: 'center',
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.10)',
    width: '100%',
    marginVertical: 16,
  },

  // Explanation text
  explanation: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    color: 'rgba(255,255,255,0.70)',
    textAlign: 'center',
    lineHeight: 22,
  },
  domainHighlight: {
    color: 'rgba(255,255,255,0.90)',
    fontFamily: fontFamily.medium,
  },

  // Action buttons
  actions: {
    gap: 12,
  },
  primaryButton: {
    height: 48,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.semiBold,
    color: '#FFFFFF',
  },
  outlineButton: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  outlineButtonText: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.semiBold,
    color: '#FFFFFF',
  },
  ghostButton: {
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  ghostButtonText: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.medium,
    color: 'rgba(255,255,255,0.80)',
  },
});
