/**
 * S7 Smoke Test — Metro Resolution Validation
 *
 * Temporary screen that imports 6+ modules from @clstr/shared and @clstr/core
 * to verify Metro can resolve all monorepo cross-package imports.
 *
 * DELETE THIS FILE after validation passes.
 */
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';

// ─── @clstr/core imports ─────────────────────────────────────
import { QUERY_KEYS, CHANNELS, createSupabaseClient } from '@clstr/core';

// ─── @clstr/shared imports ───────────────────────────────────
import { tokens } from '@clstr/shared/design/tokens';
import { getEnvVariable } from '@clstr/shared/platform/env';
import { authStorage } from '@clstr/shared/platform/storage';

// ─── Type imports (verify .d.ts resolution) ──────────────────
import type { AuthStackParamList, RootStackParamList } from '@clstr/shared/navigation';

const checks = [
  { label: 'QUERY_KEYS', ok: typeof QUERY_KEYS === 'object' && !!QUERY_KEYS.feed },
  { label: 'CHANNELS', ok: typeof CHANNELS === 'object' && typeof CHANNELS.messages === 'function' },
  { label: 'createSupabaseClient', ok: typeof createSupabaseClient === 'function' },
  { label: 'tokens', ok: typeof tokens === 'object' && !!tokens.colors },
  { label: 'getEnvVariable', ok: typeof getEnvVariable === 'function' },
  { label: 'authStorage', ok: typeof authStorage === 'object' && typeof authStorage.getItem === 'function' },
  { label: 'AuthStackParamList (type)', ok: true }, // If this file compiles, the type resolved
  { label: 'RootStackParamList (type)', ok: true },
];

export default function SmokeTestScreen() {
  const passed = checks.filter((c) => c.ok).length;
  const total = checks.length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>S7 Smoke Test</Text>
      <Text style={styles.summary}>
        {passed}/{total} checks passed
      </Text>

      {checks.map((c) => (
        <View key={c.label} style={styles.row}>
          <Text style={[styles.indicator, c.ok ? styles.pass : styles.fail]}>
            {c.ok ? '✓' : '✗'}
          </Text>
          <Text style={styles.label}>{c.label}</Text>
        </View>
      ))}

      <Text style={styles.footer}>
        Delete apps/mobile/src/smoke-test.tsx after all checks pass.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  content: { padding: 24, paddingTop: 80 },
  heading: { fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 8 },
  summary: { fontSize: 16, color: '#94a3b8', marginBottom: 24 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  indicator: { fontSize: 18, fontWeight: '700', width: 28 },
  pass: { color: '#22c55e' },
  fail: { color: '#ef4444' },
  label: { fontSize: 15, color: '#e2e8f0' },
  footer: { marginTop: 32, fontSize: 13, color: '#64748b', fontStyle: 'italic' },
});
