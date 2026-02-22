/**
 * Type stub for @react-native-google-signin/google-signin.
 *
 * The actual package is installed in apps/mobile and resolved
 * at runtime by Metro bundler. This declaration silences TS
 * errors in the shared package where the native dependency
 * is consumed via dynamic import.
 */
declare module '@react-native-google-signin/google-signin' {
  export interface ConfigureParams {
    webClientId?: string;
    offlineAccess?: boolean;
    hostedDomain?: string;
    forceCodeForRefreshToken?: boolean;
    accountName?: string;
    scopes?: string[];
  }

  export interface SignInResponse {
    data: {
      idToken: string | null;
      user: {
        email: string;
        id: string;
        name: string | null;
        photo: string | null;
        familyName: string | null;
        givenName: string | null;
      };
    } | null;
    type: 'success' | 'cancelled';
  }

  export const GoogleSignin: {
    configure(params?: ConfigureParams): void;
    hasPlayServices(params?: { showPlayServicesUpdateDialog?: boolean }): Promise<boolean>;
    signIn(): Promise<SignInResponse>;
    signOut(): Promise<null>;
    revokeAccess(): Promise<null>;
    isSignedIn(): boolean;
    getCurrentUser(): SignInResponse['data'] | null;
  };
}
