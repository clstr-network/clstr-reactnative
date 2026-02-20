/**
 * DevTestOverlay — In-app testing panel for Phase 9 validation.
 *
 * ONLY renders in __DEV__ mode. Provides tappable buttons for every
 * test scenario described in the local testing runbook:
 *
 * - Custom scheme deep links (auth callback, profile, post, event)
 * - Idempotency guard validation
 * - Cold start queue simulation
 * - Auth state inspection
 * - SecureStore persistence check
 * - Navigation state dump
 * - Session refresh
 * - Chat stress test
 * - Full diagnostic dump
 *
 * Floating button in bottom-right corner; tap to expand panel.
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  Modal,
  SafeAreaView,
} from 'react-native';

import {
  simulateDeepLink,
  testAuthCallbackPKCE,
  testAuthCallbackError,
  testAuthCallbackImplicit,
  testIdempotencyGuard,
  testDeepLinkDedup,
  testDeepLinkProfile,
  testDeepLinkPost,
  testDeepLinkEvent,
  testDeepLinkMessaging,
  testColdStartQueue,
  getAuthSnapshot,
  inspectSecureStore,
  clearSecureStore,
  getNavSnapshot,
  testSessionRefresh,
  stressSendMessages,
  runFullDiagnostic,
} from '../__tests__/testHarness';

function resultAlert(title: string, data: unknown) {
  Alert.alert(title, JSON.stringify(data, null, 2), [{ text: 'OK' }]);
}

interface TestButton {
  label: string;
  emoji: string;
  onPress: () => void | Promise<void>;
}

export function DevTestOverlay() {
  const [visible, setVisible] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const addLog = useCallback((msg: string) => {
    const ts = new Date().toLocaleTimeString();
    setLog((prev) => [`[${ts}] ${msg}`, ...prev].slice(0, 50));
  }, []);

  const runTest = useCallback(
    (name: string, fn: () => unknown | Promise<unknown>) => {
      return async () => {
        addLog(`Running: ${name}`);
        try {
          const result = await fn();
          const str = JSON.stringify(result, null, 2);
          addLog(`${name} → ${str}`);
          resultAlert(name, result);
        } catch (err: any) {
          const msg = err?.message ?? String(err);
          addLog(`${name} ERROR: ${msg}`);
          resultAlert(`${name} — ERROR`, msg);
        }
      };
    },
    [addLog],
  );

  const tests: TestButton[] = [
    // ── Step 1: Deep Link Auth Callback ──
    {
      label: 'Auth PKCE callback (fake code)',
      emoji: '🔑',
      onPress: runTest('Auth PKCE', testAuthCallbackPKCE),
    },
    {
      label: 'Auth error callback',
      emoji: '❌',
      onPress: runTest('Auth Error', testAuthCallbackError),
    },
    {
      label: 'Auth implicit callback',
      emoji: '🔓',
      onPress: runTest('Auth Implicit', testAuthCallbackImplicit),
    },
    {
      label: 'Idempotency guard (double tap)',
      emoji: '🛡️',
      onPress: runTest('Idempotency', testIdempotencyGuard),
    },

    // ── Dedup Stress ──
    {
      label: 'Dedup stress (5× same URL)',
      emoji: '🔁',
      onPress: runTest('Dedup Stress', testDeepLinkDedup),
    },

    // ── Step 2: Cold Start Deep Link ──
    {
      label: 'Cold start queue test',
      emoji: '🧊',
      onPress: runTest('Cold Start', testColdStartQueue),
    },

    // ── Step 4: Auth Persistence (R6) ──
    {
      label: 'Auth state snapshot',
      emoji: '👤',
      onPress: runTest('Auth Snapshot', getAuthSnapshot),
    },
    {
      label: 'SecureStore inspect',
      emoji: '🔒',
      onPress: runTest('SecureStore', inspectSecureStore),
    },
    {
      label: 'SecureStore CLEAR',
      emoji: '🗑️',
      onPress: runTest('Clear SecureStore', async () => {
        await clearSecureStore();
        return { cleared: true };
      }),
    },
    {
      label: 'Session refresh',
      emoji: '🔄',
      onPress: runTest('Session Refresh', testSessionRefresh),
    },

    // ── Navigation Tests ──
    {
      label: 'Nav state snapshot',
      emoji: '🗺️',
      onPress: runTest('Nav Snapshot', () => getNavSnapshot()),
    },
    {
      label: 'Deep link → Profile',
      emoji: '👤',
      onPress: runTest('DL Profile', testDeepLinkProfile),
    },
    {
      label: 'Deep link → Post',
      emoji: '📝',
      onPress: runTest('DL Post', testDeepLinkPost),
    },
    {
      label: 'Deep link → Event',
      emoji: '📅',
      onPress: runTest('DL Event', testDeepLinkEvent),
    },
    {
      label: 'Deep link → Messaging',
      emoji: '💬',
      onPress: runTest('DL Messaging', testDeepLinkMessaging),
    },
    {
      label: 'Custom URL deep link',
      emoji: '🔗',
      onPress: async () => {
        Alert.prompt
          ? Alert.prompt('Custom Deep Link', 'Enter URL (e.g., clstr://profile/abc)', (url) => {
              if (url) {
                const result = simulateDeepLink(url);
                addLog(`Custom DL → ${JSON.stringify(result)}`);
                resultAlert('Custom Deep Link', result);
              }
            })
          : (() => {
              // Android fallback (no Alert.prompt)
              const url = 'clstr://profile/custom-test';
              const result = simulateDeepLink(url);
              addLog(`Custom DL → ${JSON.stringify(result)}`);
              resultAlert('Custom Deep Link (default URL)', result);
            })();
      },
    },

    // ── Step 5: Chat Stress Test ──
    {
      label: 'Chat stress (20 msgs)',
      emoji: '💥',
      onPress: runTest('Chat Stress', async () => {
        Alert.alert(
          'Chat Stress Test',
          'Enter a receiver user ID in the console.\nUsing placeholder for now.',
          [{ text: 'OK' }],
        );
        return { note: 'Call stressSendMessages(receiverId, 20) from debugger console' };
      }),
    },

    // ── Full Diagnostic ──
    {
      label: 'FULL DIAGNOSTIC DUMP',
      emoji: '🔬',
      onPress: runTest('Full Diagnostic', runFullDiagnostic),
    },
  ];

  if (!__DEV__) return null;

  return (
    <>
      {/* Floating trigger button */}
      <Pressable
        style={styles.fab}
        onPress={() => setVisible(true)}
        hitSlop={8}
      >
        <Text style={styles.fabText}>🧪</Text>
      </Pressable>

      {/* Test panel modal */}
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setVisible(false)}
      >
        <SafeAreaView style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Phase 9 Test Harness</Text>
            <Pressable onPress={() => setVisible(false)} hitSlop={12}>
              <Text style={styles.closeBtn}>✕</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            {/* Test buttons */}
            <Text style={styles.sectionTitle}>Test Scenarios</Text>
            {tests.map((t, i) => (
              <Pressable
                key={i}
                style={({ pressed }) => [
                  styles.testBtn,
                  pressed && styles.testBtnPressed,
                ]}
                onPress={t.onPress}
              >
                <Text style={styles.testBtnEmoji}>{t.emoji}</Text>
                <Text style={styles.testBtnLabel}>{t.label}</Text>
              </Pressable>
            ))}

            {/* Log output */}
            <Text style={styles.sectionTitle}>Log</Text>
            {log.length === 0 && (
              <Text style={styles.logEmpty}>No test output yet</Text>
            )}
            {log.map((entry, i) => (
              <Text key={i} style={styles.logEntry}>
                {entry}
              </Text>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 16,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    zIndex: 9999,
  },
  fabText: {
    fontSize: 24,
  },
  modal: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A2E',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#E0E0E0',
  },
  closeBtn: {
    fontSize: 22,
    color: '#A0A0A0',
    paddingHorizontal: 8,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 20,
    marginBottom: 12,
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#141428',
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1E1E3A',
  },
  testBtnPressed: {
    backgroundColor: '#1E1E3A',
  },
  testBtnEmoji: {
    fontSize: 20,
    marginRight: 12,
    width: 28,
    textAlign: 'center',
  },
  testBtnLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#D0D0D0',
    flex: 1,
  },
  logEmpty: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
  logEntry: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#8B8B8B',
    marginBottom: 4,
    lineHeight: 16,
  },
});
