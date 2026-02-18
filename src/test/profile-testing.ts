/**
 * Profile Creation Testing Utilities
 *
 * This file contains utilities to test the profile creation flow
 * from signup to profile completion.
 *
 * NOTE: This is intentionally located under src/test so it cannot be
 * accidentally imported into production bundles.
 */

import { supabase } from "@/integrations/supabase/client";
import {
  createProfileRecord,
  deleteProfile,
  uploadProfileAvatar,
  getProfileById,
  updateProfileRecord,
  profileExists,
  validateProfileData,
  calculateProfileCompletion,
  isProfileComplete,
  getMissingProfileFields,
  ProfileError,
} from "@/lib/profile";
import type { ProfileSignupPayload } from "@/lib/profile";

type TestResult = { success: boolean; error?: string };

type SignupTestResult = TestResult & { userId?: string };

type TestProfileApi = {
  runAll: () => Promise<void>;
  testSignup: (payload: ProfileSignupPayload, password?: string) => Promise<SignupTestResult>;
  testUpdate: (userId: string) => Promise<TestResult>;
  testCompletion: () => TestResult;
  createTestData: () => ProfileSignupPayload;
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

declare global {
  interface Window {
    testProfile?: TestProfileApi;
  }
}

/**
 * Test data for profile creation
 */
export const createTestProfileData = (): ProfileSignupPayload => ({
  firstName: "Test",
  lastName: "User",
  email: `test.user.${Date.now()}@university.edu`,
  university: "Test University",
  major: "Computer Science",
  graduationYear: "2024",
  bio: "This is a test bio for the profile creation feature testing.",
  interests: ["Networking", "Mentorship", "Career Growth"],
  userType: "student",
});

/**
 * Test the complete signup flow
 */
export const testSignupFlow = async (
  payload: ProfileSignupPayload,
  password: string = "Test123456!"
): Promise<SignupTestResult> => {
  try {
    console.log("🧪 Testing signup flow...");

    // Step 1: Validate profile data
    const validation = validateProfileData({
      full_name: `${payload.firstName} ${payload.lastName}`,
      email: payload.email,
      bio: payload.bio,
      interests: payload.interests,
      graduation_year: payload.graduationYear,
    });

    if (!validation.valid) {
      return { success: false, error: `Validation failed: ${validation.errors.join(", ")}` };
    }
    console.log("✓ Profile data validation passed");

    // Step 2: Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: payload.email,
      password,
      options: {
        data: {
          full_name: `${payload.firstName} ${payload.lastName}`,
          role: "student",
        },
      },
    });

    if (authError || !authData.user) {
      return { success: false, error: `Auth signup failed: ${authError?.message}` };
    }
    console.log("✓ Auth user created:", authData.user.id);

    const userId = authData.user.id;

    // Step 3: Create profile record
    await createProfileRecord({
      userId,
      payload,
      avatarUrl: null,
    });
    console.log("✓ Profile record created");

    // Step 4: Verify profile exists
    const exists = await profileExists(userId);
    if (!exists) {
      return { success: false, error: "Profile verification failed" };
    }
    console.log("✓ Profile exists verification passed");

    // Step 5: Fetch and verify profile data
    const profile = await getProfileById(userId);
    if (!profile) {
      return { success: false, error: "Profile fetch failed" };
    }
    console.log("✓ Profile fetched successfully");

    // Step 6: Verify profile data
    if (profile.full_name !== `${payload.firstName} ${payload.lastName}`) {
      return { success: false, error: "Profile name mismatch" };
    }
    if (profile.email !== payload.email) {
      return { success: false, error: "Profile email mismatch" };
    }
    if (profile.university !== payload.university) {
      return { success: false, error: "Profile university mismatch" };
    }
    console.log("✓ Profile data verification passed");

    // Step 7: Check profile completion
    const completion = profile.profile_completion || 0;
    console.log(`✓ Profile completion: ${completion}%`);

    if (!isProfileComplete(profile)) {
      const missing = getMissingProfileFields(profile);
      console.log(`ℹ Profile incomplete. Missing: ${missing.join(", ")}`);
    } else {
      console.log("✓ Profile is complete");
    }

    return { success: true, userId };
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    console.error("❌ Test failed:", message);
    return { success: false, error: message };
  }
};

/**
 * Test profile update flow
 */
export const testProfileUpdate = async (userId: string): Promise<TestResult> => {
  try {
    console.log("🧪 Testing profile update...");

    // Fetch current profile
    const profile = await getProfileById(userId);
    if (!profile) {
      return { success: false, error: "Profile not found" };
    }
    console.log("✓ Current profile fetched");

    const oldCompletion = profile.profile_completion || 0;

    // Update profile
    await updateProfileRecord(userId, {
      bio: "Updated bio with more information to improve profile completion.",
      location: "San Francisco, CA",
      headline: "Software Engineer | Test User",
    });
    console.log("✓ Profile updated");

    // Verify update
    const updatedProfile = await getProfileById(userId);
    if (!updatedProfile) {
      return { success: false, error: "Updated profile not found" };
    }

    if (updatedProfile.bio !== "Updated bio with more information to improve profile completion.") {
      return { success: false, error: "Bio update failed" };
    }
    if (updatedProfile.location !== "San Francisco, CA") {
      return { success: false, error: "Location update failed" };
    }
    console.log("✓ Profile update verification passed");

    const newCompletion = updatedProfile.profile_completion || 0;
    console.log(`✓ Profile completion updated: ${oldCompletion}% → ${newCompletion}%`);

    return { success: true };
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    console.error("❌ Update test failed:", message);
    return { success: false, error: message };
  }
};

/**
 * Test profile completion calculation
 */
export const testProfileCompletion = (): TestResult => {
  try {
    console.log("🧪 Testing profile completion calculation...");

    // Test with minimal data
    const minimalCompletion = calculateProfileCompletion({});
    console.log(`✓ Minimal profile: ${minimalCompletion}%`);

    // Test with full data
    const fullCompletion = calculateProfileCompletion({
      fullName: "Test User",
      university: "Test University",
      major: "Computer Science",
      graduationYear: "2024",
      bio: "This is a comprehensive bio with more than thirty characters.",
      interests: ["Interest 1", "Interest 2", "Interest 3"],
      avatarUrl: "https://example.com/avatar.jpg",
    });
    console.log(`✓ Complete profile: ${fullCompletion}%`);

    if (fullCompletion !== 100) {
      return { success: false, error: `Expected 100%, got ${fullCompletion}%` };
    }

    return { success: true };
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    console.error("❌ Completion test failed:", message);
    return { success: false, error: message };
  }
};

/**
 * Run all profile creation tests
 */
export const runAllProfileTests = async (): Promise<void> => {
  console.log("🚀 Starting profile creation tests...\n");

  // Test 1: Profile completion calculation
  const completionTest = testProfileCompletion();
  console.log(
    completionTest.success
      ? "✅ Profile completion test PASSED\n"
      : `❌ Profile completion test FAILED: ${completionTest.error}\n`
  );

  // Test 2: Signup flow
  const testData = createTestProfileData();
  const signupTest = await testSignupFlow(testData);
  console.log(
    signupTest.success
      ? `✅ Signup flow test PASSED (userId: ${signupTest.userId})\n`
      : `❌ Signup flow test FAILED: ${signupTest.error}\n`
  );

  if (!signupTest.success || !signupTest.userId) {
    return;
  }

  // Test 3: Profile update
  const updateTest = await testProfileUpdate(signupTest.userId);
  console.log(
    updateTest.success
      ? "✅ Profile update test PASSED\n"
      : `❌ Profile update test FAILED: ${updateTest.error}\n`
  );

  // Cleanup
  try {
    await deleteProfile(signupTest.userId);
    console.log("🧹 Cleaned up test profile");
  } catch (error) {
    console.warn("Failed to clean up test profile", error);
  }
};

// Attach to window for ad-hoc manual testing in dev console.
if (typeof window !== "undefined") {
  window.testProfile = {
    runAll: runAllProfileTests,
    testSignup: testSignupFlow,
    testUpdate: testProfileUpdate,
    testCompletion: testProfileCompletion,
    createTestData: createTestProfileData,
  };
}
