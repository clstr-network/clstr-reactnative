/**
 * Alumni Invite Claim Screen â€” Phase 4.5
 *
 * Deep-link landing: clstr://alumni-invite?token=...
 *
 * Flow: validate token â†’ confirm identity â†’ auth (OTP or password) â†’ accept â†’ redirect to onboarding
 * 7 steps: validating | confirm | auth | otp | accepting | done | error
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

import { useThemeColors } from '@/constants/colors';
import { fontFamily } from '@/constants/typography';
import { supabase } from '@/lib/adapters/core-client';
import { useAlumniInviteClaim } from '@/lib/hooks/useAlumniInviteClaim';
import { QUERY_KEYS } from '@/lib/query-keys';

type Step = 'validating' | 'confirm' | 'auth' | 'otp' | 'accepting' | 'done' | 'error';

export default function AlumniInviteScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { token } = useLocalSearchParams<{ token: string }>();

  const {
    isValidating,
    inviteData,
    error: tokenError,
    acceptInvite,
    disputeInvite,
  } = useAlumniInviteClaim(token ?? null);

  const [step, setStep] = useState<Step>('validating');
  const [personalEmail, setPersonalEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [authMode, setAuthMode] = useState<'otp' | 'password'>('otp');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Dispute modal
  const [showDispute, setShowDispute] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [isDisputing, setIsDisputing] = useState(false);

  /* Move to confirm once token is validated */
  useEffect(() => {
    if (inviteData?.valid) {
      setPersonalEmail(inviteData.personal_email ?? '');
      setStep('confirm');
    } else if (tokenError) {
      setStep('error');
    }
  }, [inviteData, tokenError]);

  /* ---------- Auth: send OTP ---------- */
  const handleSendOtp = useCallback(async () => {
    if (!personalEmail) return;
    setIsSubmitting(true);
    setAuthError(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: personalEmail,
        options: {
          shouldCreateUser: true,
          data: {
            full_name: inviteData?.full_name ?? '',
            alumni_invite_token: token,
          },
        },
      });
      if (error) throw error;
      setStep('otp');
      Alert.alert('Code sent', 'Check your personal email for the verification code.');
    } catch (err: any) {
      setAuthError(err.message ?? 'Failed to send verification code');
    } finally {
      setIsSubmitting(false);
    }
  }, [personalEmail, inviteData, token]);

  /* ---------- Auth: verify OTP ---------- */
  const handleVerifyOtp = useCallback(async () => {
    if (!otpCode) return;
    setIsSubmitting(true);
    setAuthError(null);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: personalEmail,
        token: otpCode,
        type: 'email',
      });
      if (error) throw error;
      if (!data.user) throw new Error('Auth user not created');

      setStep('accepting');
      const result = await acceptInvite();
      if (!result.success) throw new Error(result.error ?? 'Failed to accept invite');

      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.identity });
      setStep('done');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setTimeout(() => router.replace('/(tabs)'), 1500);
    } catch (err: any) {
      setAuthError(err.message ?? 'Verification failed');
      if (step === 'accepting') setStep('otp');
    } finally {
      setIsSubmitting(false);
    }
  }, [otpCode, personalEmail, acceptInvite, queryClient, step]);

  /* ---------- Auth: password signup ---------- */
  const handlePasswordSignup = useCallback(async () => {
    if (!personalEmail || !password) return;
    setIsSubmitting(true);
    setAuthError(null);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: personalEmail,
        password,
        options: {
          data: {
            full_name: inviteData?.full_name ?? '',
            alumni_invite_token: token,
          },
        },
      });
      if (error) throw error;
      if (!data.user) throw new Error('Auth user not created');

      setStep('accepting');
      const result = await acceptInvite();
      if (!result.success) throw new Error(result.error ?? 'Failed to accept invite');

      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.identity });
      setStep('done');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setTimeout(() => router.replace('/(tabs)'), 1500);
    } catch (err: any) {
      setAuthError(err.message ?? 'Signup failed');
      if (step === 'accepting') setStep('auth');
    } finally {
      setIsSubmitting(false);
    }
  }, [personalEmail, password, inviteData, token, acceptInvite, queryClient, step]);

  /* ---------- Dispute handler ---------- */
  const handleDispute = useCallback(async () => {
    setIsDisputing(true);
    const success = await disputeInvite(disputeReason);
    setIsDisputing(false);
    if (success) {
      setShowDispute(false);
      Alert.alert('Reported', "Thanks for reporting. We'll review this invite.");
      setStep('error');
    } else {
      Alert.alert('Error', 'Failed to report dispute');
    }
  }, [disputeInvite, disputeReason]);

  /* ---------- Render helpers ---------- */
  const renderCard = (children: React.ReactNode) => (
    <View style={[styles.card, { borderColor: 'rgba(255,255,255,0.1)' }]}>{children}</View>
  );

  const renderPrimaryButton = (
    label: string,
    onPress: () => void,
    disabled?: boolean,
    loading?: boolean,
  ) => (
    <Pressable
      style={[styles.primaryBtn, { opacity: disabled ? 0.5 : 1 }]}
      onPress={onPress}
      disabled={disabled}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#000" />
      ) : (
        <Text style={styles.primaryBtnText}>{label}</Text>
      )}
    </Pressable>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.logoArea}>
          <Text style={styles.logoText}>clstr.network</Text>
          <Text style={[styles.logoSub, { color: colors.textTertiary }]}>Alumni Network</Text>
        </View>

        {/* â”€â”€ Validating â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {(step === 'validating' || isValidating) &&
          renderCard(
            <View style={styles.centeredPadding}>
              <ActivityIndicator size="large" color={colors.textSecondary} />
              <Text style={[styles.centeredText, { color: colors.textSecondary }]}>
                Validating your invite...
              </Text>
            </View>,
          )}

        {/* â”€â”€ Error â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {step === 'error' &&
          renderCard(
            <View style={styles.centeredPadding}>
              <Ionicons name="warning-outline" size={40} color="#facc15" style={{ marginBottom: 8 }} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>Invite Issue</Text>
              <Text style={[styles.centeredText, { color: colors.textSecondary }]}>
                {tokenError ?? 'This invite is no longer valid.'}
              </Text>
              <View style={styles.btnRow}>
                <Pressable
                  style={[styles.outlineBtn, { borderColor: 'rgba(255,255,255,0.1)' }]}
                  onPress={() => router.replace('/(auth)' as any)}
                >
                  <Text style={[styles.outlineBtnText, { color: colors.textSecondary }]}>
                    Go to Login
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.outlineBtn, { borderColor: 'rgba(255,255,255,0.1)' }]}
                  onPress={() => router.push('/help-center' as any)}
                >
                  <Text style={[styles.outlineBtnText, { color: colors.textSecondary }]}>
                    Contact Support
                  </Text>
                </Pressable>
              </View>
            </View>,
          )}

        {/* â”€â”€ Confirm Identity â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {step === 'confirm' &&
          inviteData &&
          renderCard(
            <>
              <View style={styles.cardHeader}>
                <View style={styles.iconBadge}>
                  <Ionicons name="school-outline" size={20} color="#60a5fa" />
                </View>
                <View>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Alumni Invite</Text>
                  <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
                    Confirm your alumni identity
                  </Text>
                </View>
              </View>

              {/* College email (locked) */}
              <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>
                Your College Email (Identity)
              </Text>
              <View style={[styles.lockedField, { borderColor: 'rgba(255,255,255,0.1)' }]}>
                <Ionicons name="shield-checkmark" size={16} color="#34d399" />
                <Text style={[styles.monoText, { color: colors.text }]}>
                  {inviteData.college_email}
                </Text>
              </View>
              <Text style={[styles.fieldHint, { color: colors.textTertiary }]}>
                This verifies your alumni identity. It cannot be changed.
              </Text>

              {/* Pre-filled info */}
              {(inviteData.full_name || inviteData.grad_year || inviteData.major) && (
                <View style={[styles.infoBadge, { backgroundColor: 'rgba(255,255,255,0.04)' }]}>
                  {inviteData.full_name && (
                    <Text style={[styles.infoName, { color: colors.text }]}>
                      {inviteData.full_name}
                    </Text>
                  )}
                  <View style={styles.infoRow}>
                    {inviteData.grad_year && (
                      <Text style={[styles.infoMeta, { color: colors.textSecondary }]}>
                        Class of {inviteData.grad_year}
                      </Text>
                    )}
                    {(inviteData as any).degree && (
                      <Text style={[styles.infoMeta, { color: colors.textSecondary }]}>
                        {(inviteData as any).degree}
                      </Text>
                    )}
                    {inviteData.major && (
                      <Text style={[styles.infoMeta, { color: colors.textSecondary }]}>
                        {inviteData.major}
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {/* Divider */}
              <View style={[styles.divider, { backgroundColor: 'rgba(255,255,255,0.08)' }]} />

              {/* Personal email */}
              <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>
                Your Personal Email (Login)
              </Text>
              <View style={[styles.lockedField, { borderColor: 'rgba(255,255,255,0.1)' }]}>
                <Ionicons name="mail-outline" size={16} color="#60a5fa" />
                <Text style={[styles.monoText, { color: colors.text }]}>
                  {inviteData.personal_email}
                </Text>
              </View>
              <Text style={[styles.fieldHint, { color: colors.textTertiary }]}>
                {"You'll log in with this email. A verification code will be sent here."}
              </Text>

              {/* Actions */}
              <View style={{ marginTop: 20 }}>
                {renderPrimaryButton("Yes, that's me â€” Continue", () => setStep('auth'))}
              </View>

              <Pressable
                style={styles.ghostBtn}
                onPress={() => setShowDispute(true)}
              >
                <Ionicons name="flag-outline" size={12} color={colors.textTertiary} />
                <Text style={[styles.ghostBtnText, { color: colors.textTertiary }]}>
                  {"This isn't me"}
                </Text>
              </Pressable>
            </>,
          )}

        {/* â”€â”€ Auth Step (OTP or Password) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {step === 'auth' &&
          renderCard(
            <>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Create Your Account</Text>
              <Text style={[styles.cardDesc, { color: colors.textSecondary, marginBottom: 16 }]}>
                Sign up with your personal email to join the network
              </Text>

              <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>Personal Email</Text>
              <TextInput
                style={[
                  styles.textInput,
                  { color: colors.text, borderColor: 'rgba(255,255,255,0.1)', opacity: 0.7 },
                ]}
                value={personalEmail}
                editable={false}
              />

              {authMode === 'password' && (
                <>
                  <Text style={[styles.fieldLabel, { color: colors.textTertiary, marginTop: 12 }]}>
                    Password
                  </Text>
                  <TextInput
                    style={[styles.textInput, { color: colors.text, borderColor: 'rgba(255,255,255,0.1)' }]}
                    placeholder="Create a password (min 6 chars)"
                    placeholderTextColor={colors.textTertiary}
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                  />
                </>
              )}

              {authError && (
                <View style={[styles.errorBanner, { borderColor: 'rgba(239,68,68,0.2)' }]}>
                  <Ionicons name="alert-circle" size={14} color="#f87171" />
                  <Text style={styles.errorText}>{authError}</Text>
                </View>
              )}

              <View style={{ marginTop: 16 }}>
                {authMode === 'otp'
                  ? renderPrimaryButton(
                      'Send Verification Code',
                      handleSendOtp,
                      isSubmitting || !personalEmail,
                      isSubmitting,
                    )
                  : renderPrimaryButton(
                      'Create Account',
                      handlePasswordSignup,
                      isSubmitting || !personalEmail || password.length < 6,
                      isSubmitting,
                    )}
              </View>

              <Pressable
                style={styles.ghostBtn}
                onPress={() => setAuthMode((m) => (m === 'otp' ? 'password' : 'otp'))}
              >
                <Text style={[styles.ghostBtnText, { color: colors.textTertiary }]}>
                  {authMode === 'otp' ? 'Use password instead' : 'Use magic code instead'}
                </Text>
              </Pressable>
            </>,
          )}

        {/* â”€â”€ OTP Verification â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {step === 'otp' &&
          renderCard(
            <>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Enter Verification Code</Text>
              <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
                We sent a code to{' '}
                <Text style={{ fontFamily: fontFamily.regular ?? fontFamily.regular }}>
                  {personalEmail}
                </Text>
              </Text>

              <Text style={[styles.fieldLabel, { color: colors.textTertiary, marginTop: 12 }]}>
                6-digit code
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  styles.otpInput,
                  { color: colors.text, borderColor: 'rgba(255,255,255,0.1)' },
                ]}
                placeholder="000000"
                placeholderTextColor="rgba(255,255,255,0.15)"
                keyboardType="number-pad"
                maxLength={6}
                value={otpCode}
                onChangeText={(t) => setOtpCode(t.replace(/\D/g, ''))}
                autoFocus
              />

              {authError && (
                <View style={[styles.errorBanner, { borderColor: 'rgba(239,68,68,0.2)' }]}>
                  <Ionicons name="alert-circle" size={14} color="#f87171" />
                  <Text style={styles.errorText}>{authError}</Text>
                </View>
              )}

              <View style={{ marginTop: 16 }}>
                {renderPrimaryButton(
                  'Verify & Continue',
                  handleVerifyOtp,
                  isSubmitting || otpCode.length !== 6,
                  isSubmitting,
                )}
              </View>

              <Pressable
                style={styles.ghostBtn}
                onPress={handleSendOtp}
                disabled={isSubmitting}
              >
                <Ionicons name="refresh" size={12} color={colors.textTertiary} />
                <Text style={[styles.ghostBtnText, { color: colors.textTertiary }]}>
                  Resend code
                </Text>
              </Pressable>
            </>,
          )}

        {/* â”€â”€ Accepting â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {step === 'accepting' &&
          renderCard(
            <View style={styles.centeredPadding}>
              <ActivityIndicator size="large" color={colors.textSecondary} />
              <Text style={[styles.centeredText, { color: colors.textSecondary }]}>
                Setting up your alumni account...
              </Text>
            </View>,
          )}

        {/* â”€â”€ Done â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {step === 'done' &&
          renderCard(
            <View style={styles.centeredPadding}>
              <Ionicons name="checkmark-circle" size={48} color="#34d399" style={{ marginBottom: 8 }} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>{"You're in!"}</Text>
              <Text style={[styles.centeredText, { color: colors.textSecondary }]}>
                Redirecting to onboarding...
              </Text>
            </View>,
          )}
      </ScrollView>

      {/* â”€â”€ Dispute Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Modal visible={showDispute} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowDispute(false)}>
          <Pressable style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]} onPress={() => {}}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Report Mismatch</Text>
            <Text style={[styles.cardDesc, { color: colors.textSecondary, marginBottom: 12 }]}>
              {"If this invite wasn't meant for you, let us know."}
            </Text>
            <TextInput
              style={[
                styles.textInput,
                styles.multiLineInput,
                { color: colors.text, borderColor: 'rgba(255,255,255,0.1)' },
              ]}
              placeholder="Optional: tell us more..."
              placeholderTextColor={colors.textTertiary}
              value={disputeReason}
              onChangeText={setDisputeReason}
              multiline
              textAlignVertical="top"
            />
            <View style={styles.modalBtnRow}>
              <Pressable
                style={[styles.outlineBtn, { borderColor: 'rgba(255,255,255,0.1)', flex: 1 }]}
                onPress={() => setShowDispute(false)}
              >
                <Text style={[styles.outlineBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.reportBtn, { flex: 1, opacity: isDisputing ? 0.5 : 1 }]}
                onPress={handleDispute}
                disabled={isDisputing}
              >
                {isDisputing ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.reportBtnText}>Report</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20 },
  /* Logo */
  logoArea: { alignItems: 'center', marginBottom: 32 },
  logoText: { fontSize: 20, fontFamily: fontFamily.bold, color: 'white', letterSpacing: -0.5 },
  logoSub: { fontSize: 13, fontFamily: fontFamily.regular, marginTop: 2 },
  /* Card */
  card: {
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 20,
    marginBottom: 16,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(96,165,250,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 17, fontFamily: fontFamily.semiBold },
  cardDesc: { fontSize: 13, fontFamily: fontFamily.regular, marginTop: 2 },
  /* Centered padding util */
  centeredPadding: { alignItems: 'center', paddingVertical: 40 },
  centeredText: { fontSize: 14, fontFamily: fontFamily.regular, marginTop: 12, textAlign: 'center' },
  /* Form fields */
  fieldLabel: { fontSize: 11, fontFamily: fontFamily.medium, textTransform: 'uppercase', marginBottom: 6, marginTop: 14 },
  fieldHint: { fontSize: 11, fontFamily: fontFamily.regular, marginTop: 4 },
  lockedField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  monoText: { fontSize: 13, fontFamily: fontFamily.regular ?? fontFamily.regular },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fontFamily.regular,
    fontSize: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  otpInput: {
    textAlign: 'center',
    fontSize: 24,
    letterSpacing: 8,
    fontFamily: fontFamily.regular ?? fontFamily.regular,
  },
  multiLineInput: { minHeight: 80 },
  /* Info badge */
  infoBadge: { borderRadius: 8, padding: 12, marginTop: 12 },
  infoName: { fontSize: 14, fontFamily: fontFamily.medium },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  infoMeta: { fontSize: 12, fontFamily: fontFamily.regular },
  divider: { height: 1, marginVertical: 16 },
  /* Error */
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: 'rgba(239,68,68,0.06)',
    padding: 10,
    marginTop: 12,
  },
  errorText: { fontSize: 12, fontFamily: fontFamily.regular, color: '#fca5a5', flex: 1 },
  /* Buttons */
  primaryBtn: {
    height: 44,
    borderRadius: 10,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { fontSize: 15, fontFamily: fontFamily.semiBold, color: '#000' },
  outlineBtn: {
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  outlineBtnText: { fontSize: 13, fontFamily: fontFamily.medium },
  ghostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
    marginTop: 4,
  },
  ghostBtnText: { fontSize: 12, fontFamily: fontFamily.regular },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  /* Report button */
  reportBtn: {
    height: 40,
    borderRadius: 8,
    backgroundColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportBtnText: { fontSize: 14, fontFamily: fontFamily.semiBold, color: 'white' },
  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#111',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
  },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
});
