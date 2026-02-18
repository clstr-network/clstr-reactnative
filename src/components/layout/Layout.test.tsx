import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Layout from './Layout';
import { useProfile } from '@/contexts/ProfileContext';
import { useIdentityContext } from '@/contexts/IdentityContext';
import { supabase } from '@/integrations/supabase/client';

// Mock dependencies
vi.mock('@/contexts/ProfileContext');
vi.mock('@/contexts/IdentityContext');
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
  },
}));

// Mock child components to simplify testing
vi.mock('./Navbar', () => ({
  default: () => <div data-testid="navbar">Navbar</div>,
}));
vi.mock('./Footer', () => ({
  default: () => <div data-testid="footer">Footer</div>,
}));
vi.mock('../mobile/BottomNavigation', () => ({
  default: () => <div data-testid="bottom-nav">BottomNavigation</div>,
}));
vi.mock('./AddButton', () => ({
  AddButton: () => <div data-testid="add-button">AddButton</div>,
}));
vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}));

describe('Layout Component - Auth Gating', () => {
  const mockUseProfile = useProfile as Mock;
  const mockUseIdentityContext = useIdentityContext as Mock;
  const mockGetSession = supabase.auth.getSession as Mock;
  const mockOnAuthStateChange = supabase.auth.onAuthStateChange as Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementation for auth state listener
    mockOnAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    });

    mockUseIdentityContext.mockReturnValue({
      collegeDomain: 'example.edu',
      isLoading: false,
      role: 'Student',
    });
  });

  describe('Unauthenticated User Redirection', () => {
    it('should redirect unauthenticated user to /login when accessing protected route', async () => {
      // Mock no session
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      // Mock profile context for unauthenticated user
      mockUseProfile.mockReturnValue({
        isLoading: false,
        isOnboardingRequired: false,
        refreshProfile: vi.fn(),
        hasProfile: false,
      });

      render(
        <MemoryRouter initialEntries={['/home']}>
          <Routes>
            <Route
              path="/home"
              element={(
                <Layout>
                  <div>Protected Content</div>
                </Layout>
              )}
            />
            <Route path="/login" element={<div>Login Route</div>} />
          </Routes>
        </MemoryRouter>
      );

      // Wait for auth check to complete
      await waitFor(() => {
        expect(screen.getByText('Login Route')).toBeInTheDocument();
      });
    });

    it('should show loading skeleton while checking auth', () => {
      mockGetSession.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      mockUseProfile.mockReturnValue({
        isLoading: true,
        isOnboardingRequired: false,
        refreshProfile: vi.fn(),
        hasProfile: false,
      });

      render(
        <MemoryRouter initialEntries={['/home']}>
          <Layout>
            <div>Content</div>
          </Layout>
        </MemoryRouter>
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should not redirect on public routes (login, signup, landing)', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      mockUseProfile.mockReturnValue({
        isLoading: false,
        isOnboardingRequired: false,
        refreshProfile: vi.fn(),
        hasProfile: false,
      });

      render(
        <MemoryRouter initialEntries={['/login']}>
          <Layout>
            <div>Login Page</div>
          </Layout>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Login Page')).toBeInTheDocument();
      });

    });
  });

  describe('Authenticated User with Incomplete Profile', () => {
    it('should redirect to /onboarding when profile is incomplete', async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            user: { id: 'user-123', email: 'test@example.com' },
            access_token: 'token',
          },
        },
        error: null,
      });

      mockUseProfile.mockReturnValue({
        isLoading: false,
        isOnboardingRequired: true,
        refreshProfile: vi.fn(),
        hasProfile: true,
      });

      render(
        <MemoryRouter initialEntries={['/home']}>
          <Routes>
            <Route
              path="/home"
              element={(
                <Layout>
                  <div>Home Content</div>
                </Layout>
              )}
            />
            <Route path="/onboarding" element={<div>Onboarding Route</div>} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Onboarding Route')).toBeInTheDocument();
      });
      expect(screen.queryByText('Home Content')).not.toBeInTheDocument();
    });

    it('should not show onboarding gate when already on onboarding route', async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            user: { id: 'user-123', email: 'test@example.com' },
            access_token: 'token',
          },
        },
        error: null,
      });

      mockUseProfile.mockReturnValue({
        isLoading: false,
        isOnboardingRequired: true,
        refreshProfile: vi.fn(),
        hasProfile: true,
      });

      render(
        <MemoryRouter initialEntries={['/onboarding']}>
          <Layout>
            <div>Onboarding Content</div>
          </Layout>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Onboarding Content')).toBeInTheDocument();
      });
    });
  });

  describe('Authenticated User with Complete Profile', () => {
    it('should render children when user is authenticated and profile is complete', async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            user: { id: 'user-123', email: 'test@example.com' },
            access_token: 'token',
          },
        },
        error: null,
      });

      mockUseProfile.mockReturnValue({
        isLoading: false,
        isOnboardingRequired: false,
        refreshProfile: vi.fn(),
        hasProfile: true,
      });

      render(
        <MemoryRouter initialEntries={['/home']}>
          <Layout>
            <div>Protected Home Content</div>
          </Layout>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Protected Home Content')).toBeInTheDocument();
      });

      expect(screen.queryByText('Finish onboarding to continue')).not.toBeInTheDocument();
    });

    // Skipped: AddButton is not part of Layout component - it's rendered separately in specific routes
    it.skip('should show AddButton when authenticated with complete profile', async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            user: { id: 'user-123', email: 'test@example.com' },
            access_token: 'token',
          },
        },
        error: null,
      });

      mockUseProfile.mockReturnValue({
        isLoading: false,
        isOnboardingRequired: false,
        refreshProfile: vi.fn(),
        hasProfile: true,
      });

      render(
        <MemoryRouter initialEntries={['/home']}>
          <Layout>
            <div>Content</div>
          </Layout>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('add-button')).toBeInTheDocument();
      });
    });
  });

  describe('Authenticated User Navigation', () => {
    it('should not redirect authenticated user with complete profile', async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            user: { id: 'user-123', email: 'test@example.com' },
            access_token: 'token',
          },
        },
        error: null,
      });

      mockUseProfile.mockReturnValue({
        isLoading: false,
        isOnboardingRequired: false,
        refreshProfile: vi.fn(),
        hasProfile: true,
      });

      render(
        <MemoryRouter initialEntries={['/home']}>
          <Layout>
            <div>Authenticated Content</div>
          </Layout>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Authenticated Content')).toBeInTheDocument();
      });

      // Should not redirect when user is authenticated with complete profile
      // (redirects are render-time via <Navigate>, so presence of content is the assertion)
    });
  });

  describe('Error Handling', () => {
    it('should handle auth check errors gracefully', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Network error' },
      });

      mockUseProfile.mockReturnValue({
        isLoading: false,
        isOnboardingRequired: false,
        refreshProfile: vi.fn(),
        hasProfile: false,
      });

      render(
        <MemoryRouter initialEntries={['/home']}>
          <Routes>
            <Route
              path="/home"
              element={(
                <Layout>
                  <div>Content</div>
                </Layout>
              )}
            />
            <Route path="/login" element={<div>Login Route</div>} />
          </Routes>
        </MemoryRouter>
      );

      // Should still complete loading despite error and render the layout
      await waitFor(() => {
        expect(screen.getByText('Content')).toBeInTheDocument();
      });
    });
  });
});
