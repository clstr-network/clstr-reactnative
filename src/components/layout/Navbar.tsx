
import { FormEvent, useEffect, useRef, useState, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Calendar, Loader2, Search, MessageSquare, Menu, X, Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useProfile } from '@/contexts/ProfileContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getUnreadMessageCount, subscribeToMessages } from '@/lib/messages-api';
import { useTypeaheadSearch } from '@/hooks/useTypeaheadSearch';
import { assertValidUuid } from '@/lib/uuid';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NotificationDropdown } from './NotificationDropdown';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [isTypeaheadOpen, setIsTypeaheadOpen] = useState(false);
  const desktopSearchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const { profile, isOnboardingRequired } = useProfile();
  
  // Custom debounce implementation - the @uidotdev/usehooks one is buggy
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchTerm]);
  
  // FINAL Matrix permissions for all nav items
  const { 
    canViewProjects,
    canViewClubs,
    canViewEvents,
    canViewEcoCampus,
    canViewAlumniDirectory,
    canBrowseMentors, 
    hiddenNavItems 
  } = useFeatureAccess();
  
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const typeaheadQuery = (debouncedSearchTerm ?? '').trim();
  
  const { data: typeaheadResults, isLoading: isTypeaheadLoading, error: typeaheadError } = useTypeaheadSearch({
    query: typeaheadQuery,
    collegeDomain: profile?.college_domain ?? null,
  });

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unreadMessageCount', profile?.id],
    queryFn: () => {
      if (!profile?.id) throw new Error('Profile missing');
      return getUnreadMessageCount(profile.id);
    },
    enabled: Boolean(profile?.id),
    staleTime: 15000,
    refetchInterval: 60000,
  });

  useEffect(() => {
    if (!profile?.id) return;

    const unsubscribe = subscribeToMessages(profile.id, () => {
      queryClient.invalidateQueries({ queryKey: ['unreadMessageCount', profile.id] });
    });

    return () => {
      unsubscribe();
    };
  }, [profile?.id, queryClient]);

  useEffect(() => {
    setIsTypeaheadOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsTypeaheadOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      const isInsideDesktop = desktopSearchRef.current?.contains(target);
      const isInsideMobile = mobileSearchRef.current?.contains(target);
      if (!isInsideDesktop && !isInsideMobile) {
        setIsTypeaheadOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, []);

  const handleLogoClick = () => {
    // Always navigate to /home when logo is clicked
    navigate('/home');
  };

  const handleSearchSubmit = (event: FormEvent) => {
    event.preventDefault();
    if ((searchTerm ?? '').trim().length >= 2) {
      setIsTypeaheadOpen(true);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    if ((value ?? '').trim().length >= 2) {
      setIsTypeaheadOpen(true);
    } else {
      setIsTypeaheadOpen(false);
    }
  };

  const handleSearchFocus = () => {
    if ((searchTerm ?? '').trim().length >= 2) {
      setIsTypeaheadOpen(true);
    }
  };

  const handleSearchBlur = () => {
    window.setTimeout(() => {
      const activeElement = document.activeElement;
      const isInsideDesktop = desktopSearchRef.current?.contains(activeElement);
      const isInsideMobile = mobileSearchRef.current?.contains(activeElement);
      if (!isInsideDesktop && !isInsideMobile) {
        setIsTypeaheadOpen(false);
      }
    }, 120);
  };

  const handleProfileSelect = (profileId: string) => {
    try {
      assertValidUuid(profileId, 'profile id');
      navigate(`/profile/${profileId}`);
      setIsTypeaheadOpen(false);
      setIsOpen(false);
    } catch (error) {
      toast({
        title: 'Invalid profile link',
        description: error instanceof Error ? error.message : 'Unable to open profile.',
        variant: 'destructive',
      });
    }
  };

  const handleEventSelect = (eventId: string) => {
    try {
      assertValidUuid(eventId, 'event id');
      navigate(`/events/${eventId}`);
      setIsTypeaheadOpen(false);
      setIsOpen(false);
    } catch (error) {
      toast({
        title: 'Invalid event link',
        description: error instanceof Error ? error.message : 'Unable to open event.',
        variant: 'destructive',
      });
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/');
    } catch (error) {
      toast({
        title: 'Sign out failed',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    }
  };

  const profiles = typeaheadResults?.profiles ?? [];
  const events = typeaheadResults?.events ?? [];
  const canRunTypeahead = Boolean((profile?.college_domain ?? '').trim());
  const showDropdown = isTypeaheadOpen && (searchTerm ?? '').trim().length >= 2;

  const formatEventDate = (dateValue: string | null) => {
    if (!dateValue) return 'Date TBD';
    const date = new Date(dateValue);
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
  };

  const formatProfileMeta = (profileMeta: {
    role: string | null;
    branch: string | null;
    year_of_completion: string | number | null;
    headline: string | null;
    university: string | null;
  }) => {
    const parts = [profileMeta.role, profileMeta.branch, profileMeta.year_of_completion]
      .filter(Boolean)
      .map((value) => String(value));
    if (parts.length > 0) return parts.join(' · ');
    return profileMeta.headline || profileMeta.university || 'Profile';
  };

  // Dark theme is now the universal header style across all authenticated pages
  const isDarkThemePage = true;

  return (
    <header className="sticky top-0 z-50 w-full border-b pt-safe home-theme-header">
      <div className="container flex h-14 md:h-16 items-center justify-between gap-2 px-4 md:px-6">
        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden touch-target shrink-0 text-white hover:bg-white/[0.08]"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>

        {/* Logo - Hidden on mobile when search is visible */}
        <Link to="/home" onClick={handleLogoClick} className="hidden lg:flex items-center gap-2">
          <span className="text-lg font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>clstr</span>
        </Link>

        {/* Mobile Search - LinkedIn Style (centered, always visible) */}
        <div ref={mobileSearchRef} className="relative flex-1 lg:hidden max-w-md mx-2">
          <form className="relative w-full" onSubmit={handleSearchSubmit}>
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-white/30 pointer-events-none" />
            <Input
              type="search"
              placeholder="Search..."
              className="w-full pl-8 pr-2 h-9 text-base bg-white/[0.06] border-white/10 text-white placeholder:text-white/30 focus:border-white/25 focus:ring-white/10"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={handleSearchFocus}
              onBlur={handleSearchBlur}
              aria-label="Mobile search"
            />
          </form>

          {showDropdown && (
            <div
              className="absolute left-0 right-0 top-full mt-2 rounded-xl border border-white/10 bg-black shadow-lg z-50 max-h-[80vh] overflow-y-auto"
              role="listbox"
              aria-label="Search results"
            >
              <div className="p-3 space-y-4">
                {!canRunTypeahead && (
                  <div className="text-sm text-white/50">
                    Search is unavailable until your college is verified.
                  </div>
                )}

                {isTypeaheadLoading && (
                  <div className="flex items-center gap-2 text-sm text-white/50">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Searching...</span>
                  </div>
                )}

                {typeaheadError && (
                  <div className="text-sm text-white/60">Unable to load results.</div>
                )}

                {!isTypeaheadLoading && !typeaheadError && canRunTypeahead && (
                  <>
                    <section aria-label="People">
                      <div className="text-xs font-semibold text-white/40 uppercase tracking-wide">People</div>
                      <div className="mt-2 space-y-2">
                        {profiles.length === 0 ? (
                          <div className="text-sm text-white/50">No matching people found.</div>
                        ) : (
                          profiles.map((profileResult) => (
                            <button
                              key={profileResult.id}
                              type="button"
                              onClick={() => handleProfileSelect(profileResult.id)}
                              className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-white/[0.06]"
                            >
                              <Avatar className="h-8 w-8">
                                <AvatarImage
                                  src={profileResult.avatar_url || undefined}
                                  alt={profileResult.full_name || 'Profile'}
                                />
                                <AvatarFallback className="text-xs font-semibold bg-white/10 text-white/70">
                                  {profileResult.full_name
                                    ? profileResult.full_name
                                        .split(' ')
                                        .map((chunk) => chunk[0])
                                        .join('')
                                        .slice(0, 2)
                                        .toUpperCase()
                                    : 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-white truncate">
                                  {profileResult.full_name || 'Unknown User'}
                                </div>
                                <div className="text-xs text-white/50 truncate">
                                  {formatProfileMeta(profileResult)}
                                </div>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </section>

                    <section aria-label="Events">
                      <div className="text-xs font-semibold text-white/40 uppercase tracking-wide">Events</div>
                      <div className="mt-2 space-y-2">
                        {events.length === 0 ? (
                          <div className="text-sm text-white/50">No upcoming events found.</div>
                        ) : (
                          events.map((eventResult) => (
                            <button
                              key={eventResult.id}
                              type="button"
                              onClick={() => handleEventSelect(eventResult.id)}
                              className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-white/[0.06]"
                            >
                              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white/[0.06] text-white/50">
                                <Calendar className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-white truncate">
                                  {eventResult.title || 'Untitled Event'}
                                </div>
                                <div className="text-xs text-white/50 truncate">
                                  {formatEventDate(eventResult.event_date)}
                                  {eventResult.location ? ` · ${eventResult.location}` : ''}
                                </div>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </section>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Desktop Search */}
        <div ref={desktopSearchRef} className="hidden lg:flex relative w-[250px] xl:w-[300px]">
          <form className="relative w-full" onSubmit={handleSearchSubmit}>
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-white/30 pointer-events-none" />
            <Input
              type="search"
              placeholder="Search people or events..."
              className="w-full pl-8 bg-white/[0.06] border-white/10 text-white placeholder:text-white/30 focus:border-white/25 focus:ring-white/10"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={handleSearchFocus}
              onBlur={handleSearchBlur}
              aria-label="Global search"
            />
          </form>

          {showDropdown && (
            <div
              className="absolute left-0 top-full mt-2 w-full rounded-xl border border-white/10 bg-black shadow-lg z-50"
              role="listbox"
              aria-label="Global search results"
            >
              <div className="p-3 space-y-4">
                {isTypeaheadLoading && (
                  <div className="flex items-center gap-2 text-sm text-white/50">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Searching...</span>
                  </div>
                )}

                {typeaheadError && (
                  <div className="text-sm text-white/60">Unable to load results.</div>
                )}

                {!isTypeaheadLoading && !typeaheadError && (
                  <>
                    <section aria-label="People">
                      <div className="text-xs font-semibold text-white/40 uppercase tracking-wide">People</div>
                      <div className="mt-2 space-y-2">
                        {profiles.length === 0 ? (
                          <div className="text-sm text-white/50">No matching people found.</div>
                        ) : (
                          profiles.map((profileResult) => (
                            <button
                              key={profileResult.id}
                              type="button"
                              onClick={() => handleProfileSelect(profileResult.id)}
                              className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-white/[0.06]"
                            >
                              <Avatar className="h-8 w-8">
                                <AvatarImage
                                  src={profileResult.avatar_url || undefined}
                                  alt={profileResult.full_name || 'Profile'}
                                />
                                <AvatarFallback className="text-xs font-semibold bg-white/10 text-white/70">
                                  {profileResult.full_name
                                    ? profileResult.full_name
                                        .split(' ')
                                        .map((chunk) => chunk[0])
                                        .join('')
                                        .slice(0, 2)
                                        .toUpperCase()
                                    : 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-white truncate">
                                  {profileResult.full_name || 'Unknown User'}
                                </div>
                                <div className="text-xs text-white/50 truncate">
                                  {formatProfileMeta(profileResult)}
                                </div>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </section>

                    <section aria-label="Events">
                      <div className="text-xs font-semibold text-white/40 uppercase tracking-wide">Events</div>
                      <div className="mt-2 space-y-2">
                        {events.length === 0 ? (
                          <div className="text-sm text-white/50">No upcoming events found.</div>
                        ) : (
                          events.map((eventResult) => (
                            <button
                              key={eventResult.id}
                              type="button"
                              onClick={() => handleEventSelect(eventResult.id)}
                              className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-white/[0.06]"
                            >
                              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white/[0.06] text-white/50">
                                <Calendar className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-white truncate">
                                  {eventResult.title || 'Untitled Event'}
                                </div>
                                <div className="text-xs text-white/50 truncate">
                                  {formatEventDate(eventResult.event_date)}
                                  {eventResult.location ? ` · ${eventResult.location}` : ''}
                                </div>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </section>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <nav className="hidden lg:flex items-center gap-4 xl:gap-6">
          <Link to="/home" className="text-sm font-medium text-white/70 hover:text-white transition-colors">Home</Link>
          <Link to="/network" className="text-sm font-medium text-white/70 hover:text-white transition-colors">My Network</Link>
          {canViewProjects && (
            <Link to="/projects" className="text-sm font-medium text-white/70 hover:text-white transition-colors">Projects</Link>
          )}
          {canBrowseMentors && (
            <Link to="/mentorship" className="text-sm font-medium text-white/70 hover:text-white transition-colors">Mentorship</Link>
          )}
          {canViewEvents && (
            <Link to="/events" className="text-sm font-medium text-white/70 hover:text-white transition-colors">Events</Link>
          )}
          {canViewEcoCampus && (
            <Link to="/ecocampus" className="text-sm font-medium text-white/70 hover:text-white transition-colors">EcoCampus</Link>
          )}
        </nav>

        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          <Link to="/messaging" className="hidden md:inline-flex">
            <Button variant="ghost" size="icon" className="relative touch-target text-white/70 hover:text-white hover:bg-white/[0.08]">
              <MessageSquare className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                  {unreadCount}
                </span>
              )}
            </Button>
          </Link>

          <div className="hidden md:block">
            <NotificationDropdown />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 md:h-9 md:w-9 rounded-full touch-target hover:bg-white/[0.08]">
                <Avatar className="h-8 w-8 md:h-9 md:w-9">
                  <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || 'Avatar'} />
                  <AvatarFallback className="text-xs font-semibold bg-white/10 text-white/70">
                    {profile?.full_name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 !bg-black border-white/10 text-white">
              <DropdownMenuLabel className="text-white/80">My Account</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem asChild className="text-white/70 focus:bg-white/[0.06] focus:text-white">
                <Link to="/profile" className="w-full cursor-pointer">Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="text-white/70 focus:bg-white/[0.06] focus:text-white">
                <Link to="/settings" className="w-full cursor-pointer">Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="text-white/70 focus:bg-white/[0.06] focus:text-white">
                <Link to="/saved" className="w-full cursor-pointer flex items-center gap-2">
                  <Bookmark className="h-4 w-4" />
                  Saved
                </Link>
              </DropdownMenuItem>
              {isOnboardingRequired && (
                <DropdownMenuItem asChild className="text-white/70 focus:bg-white/[0.06] focus:text-white">
                  <Link to="/onboarding" className="w-full cursor-pointer">Complete onboarding</Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem asChild className="text-white/70 focus:bg-white/[0.06] focus:text-white">
                <a
                  href="https://forms.cloud.microsoft/r/7HPbPj3Rq8"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full cursor-pointer"
                >
                  Help Center
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem onClick={handleSignOut} className="text-white/70 focus:bg-white/[0.06] focus:text-white">Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile Menu Dropdown - Navigation Links Only (Search is now in header) */}
      {isOpen && (
        <div className="lg:hidden absolute top-14 md:top-16 left-0 right-0 border-b border-white/10 shadow-lg z-50 animate-slide-down home-theme-header home-theme-header-solid">
          <nav className="flex flex-col p-2">
            <Link to="/home" className="text-base font-medium text-white/80 p-3 rounded-md hover:bg-white/[0.06] touch-target" onClick={() => setIsOpen(false)}>Home</Link>
            <Link to="/network" className="text-base font-medium text-white/80 p-3 rounded-md hover:bg-white/[0.06] touch-target" onClick={() => setIsOpen(false)}>My Network</Link>
            {canBrowseMentors && (
              <Link to="/mentorship" className="text-base font-medium text-white/80 p-3 rounded-md hover:bg-white/[0.06] touch-target" onClick={() => setIsOpen(false)}>Mentorship</Link>
            )}
            {canViewEvents && (
              <Link to="/events" className="text-base font-medium text-white/80 p-3 rounded-md hover:bg-white/[0.06] touch-target" onClick={() => setIsOpen(false)}>Events</Link>
            )}
            {canViewProjects && (
              <Link to="/projects" className="text-base font-medium text-white/80 p-3 rounded-md hover:bg-white/[0.06] touch-target" onClick={() => setIsOpen(false)}>Projects</Link>
            )}
            {canViewClubs && (
              <Link to="/clubs" className="text-base font-medium text-white/80 p-3 rounded-md hover:bg-white/[0.06] touch-target" onClick={() => setIsOpen(false)}>Clubs</Link>
            )}
            {canViewEcoCampus && (
              <Link to="/ecocampus" className="text-base font-medium text-white/80 p-3 rounded-md hover:bg-white/[0.06] touch-target" onClick={() => setIsOpen(false)}>EcoCampus</Link>
            )}
            <Link to="/saved" className="text-base font-medium text-white/80 p-3 rounded-md hover:bg-white/[0.06] touch-target flex items-center gap-2" onClick={() => setIsOpen(false)}>
              <Bookmark className="h-4 w-4" />
              Saved
            </Link>
            <Link to="/messaging" className="text-base font-medium text-white/80 p-3 rounded-md hover:bg-white/[0.06] touch-target md:hidden" onClick={() => setIsOpen(false)}>
              Messages
              {unreadCount > 0 && (
                <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs text-white">
                  {unreadCount}
                </span>
              )}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Navbar;
