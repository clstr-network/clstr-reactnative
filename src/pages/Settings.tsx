import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Bell, Lock, User, Palette, Mail, Shield, Sun, Moon, Monitor, Check, AlertTriangle, Send } from "lucide-react";
import { EmailTransitionSettings } from "@/components/profile/EmailTransitionSettings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { useProfile } from "@/contexts/ProfileContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useTheme } from "@/hooks/useTheme";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import type { ProfileVisibility, UserSettingsUpdate, ThemeMode } from "@/lib/user-settings";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { useDeactivateAccount } from "@/hooks/useDeleteAccount";
import { Alert, AlertDescription } from "@/components/ui/alert";

const THEME_OPTIONS: { value: ThemeMode; label: string; description: string; icon: React.ElementType }[] = [
    { value: "light", label: "Light", description: "A clean, bright interface", icon: Sun },
    { value: "dark", label: "Dark", description: "Easy on the eyes in low light", icon: Moon },
    { value: "system", label: "System", description: "Match your device settings", icon: Monitor },
];

const TAB_STORAGE_KEY = "settingsActiveTab";

const Settings = () => {
    const { profile, isLoading: isProfileLoading } = useProfile();
    const userId = profile?.id;
    const { settings, isLoading: isSettingsLoading, error: settingsError, updateSettings, isUpdating } = useUserSettings(userId);
    const { theme, setTheme, isUpdating: isThemeUpdating } = useTheme(userId);
    const {
        isSupported: isPushSupported,
        isConfigured: isPushConfigured,
        permissionState,
        isSubscribed: isPushSubscribed,
        isLoading: isPushLoading,
        togglePush,
        sendTest,
        isEnabling: isPushEnabling,
        isDisabling: isPushDisabling,
        isSendingTest,
    } = usePushNotifications(userId);

    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const deactivateAccountMutation = useDeactivateAccount();
    const [deleteConfirmation, setDeleteConfirmation] = useState("");
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

    const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
    const [isSendingReset, setIsSendingReset] = useState(false);
    const showAppearance = false;

    const tabOptions = useMemo(
        () => (showAppearance ? ["notifications", "privacy", "account", "appearance"] : ["notifications", "privacy", "account"]),
        [showAppearance]
    );

    const [activeTab, setActiveTab] = useState(() => {
        const tabParam = searchParams.get("tab");
        const storedTab = sessionStorage.getItem(TAB_STORAGE_KEY);
        const candidate = tabParam || storedTab || "notifications";
        return tabOptions.includes(candidate) ? candidate : "notifications";
    });

    useEffect(() => {
        const tabParam = searchParams.get("tab");
        if (tabParam && tabOptions.includes(tabParam) && tabParam !== activeTab) {
            setActiveTab(tabParam);
        }
    }, [searchParams, tabOptions, activeTab]);

    const canSendPasswordReset = useMemo(() => {
        // For transitioned users, use personal_email; otherwise college email.
        const isTransitioned = profile?.email_transition_status === 'transitioned';
        const resetEmail = (isTransitioned && profile?.personal_email) ? profile.personal_email : profile?.email;
        return !!resetEmail && resetEmail.includes("@");
    }, [profile?.email, profile?.personal_email, profile?.email_transition_status]);

    const handleUpdateSetting = async (updates: UserSettingsUpdate) => {
        try {
            await updateSettings(updates);
            setLastSavedAt(new Date());
            toast({
                title: "Settings updated",
                description: "Your preferences have been saved.",
            });
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to update settings";
            toast({
                title: "Update failed",
                description: message,
                variant: "destructive",
            });
        }
    };

    const saveStatusText = useMemo(() => {
        if (isUpdating) return "Saving…";
        if (!lastSavedAt) return "Changes save automatically.";
        return `Saved ${formatDistanceToNow(lastSavedAt, { addSuffix: true })}.`;
    }, [isUpdating, lastSavedAt]);

    const handleSendPasswordReset = async () => {
        // For transitioned users, the actual auth email is the personal email.
        // profile.email still holds the college email for identity purposes.
        // We must send the reset link to the email the user actually signs in with.
        const isTransitioned = profile?.email_transition_status === 'transitioned';
        const resetEmail = (isTransitioned && profile?.personal_email) ? profile.personal_email : profile?.email;

        if (!resetEmail) {
            toast({
                title: "No email address",
                description: "Your account does not have an email address on file.",
                variant: "destructive",
            });
            return;
        }

        setIsSendingReset(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
                redirectTo: `${window.location.origin}/update-password`,
            });

            if (error) throw error;

            toast({
                title: "Reset link sent",
                description: "Check your email for a password reset link.",
            });
            setIsPasswordDialogOpen(false);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to send reset email";
            toast({
                title: "Could not send reset link",
                description: message,
                variant: "destructive",
            });
        } finally {
            setIsSendingReset(false);
        }
    };

    const handleDeleteAccount = async () => {
        try {
            if (deleteConfirmation.trim().toUpperCase() !== "DEACTIVATE") {
                throw new Error("Please type DEACTIVATE to confirm.");
            }

            await deactivateAccountMutation.mutateAsync();

            toast({
                title: "Account deactivated",
                description: "Your account has been deactivated. Data will be permanently deleted in 15 days.",
            });

            // Navigate away immediately — the user is already signed out locally
            navigate("/", { replace: true });
        } catch (err) {
            const message = err instanceof Error
                ? err.message
                : "Failed to deactivate account. Please try again.";
            // Surface the original database/network error when available
            const detail =
                (err as any)?.originalMessage && (err as any).originalMessage !== message
                    ? (err as any).originalMessage
                    : undefined;
            toast({
                title: "Deactivation failed",
                description: detail ? `${message} (${detail})` : message,
                variant: "destructive",
            });
        } finally {
            setDeleteConfirmation("");
        }
    };

    if (isProfileLoading) {
        return (
            <div className="home-theme bg-[#000000] min-h-screen text-white">
                <div className="container py-6 px-4 md:px-6">
                    <div className="home-card-tier2 rounded-xl p-6 text-center text-white/60">
                        Loading profile…
                    </div>
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="home-theme bg-[#000000] min-h-screen text-white">
                <div className="container py-6 px-4 md:px-6">
                    <div className="home-card-tier2 rounded-xl p-6 text-center text-white/60">
                        Please sign in to access settings.
                    </div>
                </div>
            </div>
        );
    }

    if (isSettingsLoading) {
        return (
            <div className="home-theme bg-[#000000] min-h-screen text-white">
                <div className="container py-6 px-4 md:px-6">
                    <div className="home-card-tier2 rounded-xl p-6 text-center text-white/60">
                        Loading settings…
                    </div>
                </div>
            </div>
        );
    }

    if (settingsError) {
        const errorMessage =
            settingsError instanceof Error
                ? settingsError.message
                : typeof settingsError === "object" && settingsError && "message" in settingsError
                    ? String((settingsError as { message?: unknown }).message)
                    : "Unknown error";

        return (
            <div className="home-theme bg-[#000000] min-h-screen text-white">
                <div className="container py-6 px-4 md:px-6">
                    <div className="home-card-tier2 rounded-xl p-6 text-center">
                        <p className="text-white">Failed to load settings.</p>
                        <p className="text-sm text-white/50 mt-2">{errorMessage}</p>
                    </div>
                </div>
            </div>
        );
    }

    const emailNotifications = settings?.email_notifications ?? true;
    // Push notifications state comes from the hook, but we also check user_settings preference
    const pushNotificationsEnabled = isPushSubscribed && (settings?.push_notifications ?? true);
    const messageNotifications = settings?.message_notifications ?? true;
    const connectionNotifications = settings?.connection_notifications ?? true;
    const profileVisibility = (settings?.profile_visibility ?? "public") as ProfileVisibility;

    // Handler for push notification toggle
    const handlePushToggle = async (enabled: boolean) => {
        try {
            await togglePush(enabled);
            setLastSavedAt(new Date());
            toast({
                title: enabled ? "Push notifications enabled" : "Push notifications disabled",
                description: enabled
                    ? "You will now receive browser notifications."
                    : "You will no longer receive browser notifications.",
            });
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to update push notifications";
            toast({
                title: "Update failed",
                description: message,
                variant: "destructive",
            });
        }
    };

    // Handler for sending test notification
    const handleSendTestNotification = async () => {
        try {
            await sendTest();
            toast({
                title: "Test notification sent",
                description: "You should receive a notification shortly.",
            });
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to send test notification";
            toast({
                title: "Test failed",
                description: message,
                variant: "destructive",
            });
        }
    };

    return (
        <div className="home-theme bg-[#000000] min-h-screen text-white">
            <div className="container py-6 px-4 md:px-6 pb-20 md:pb-6">
                <div className="mb-6 space-y-1">
                    <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        Settings
                    </h1>
                    <p className="text-white/50 text-sm">Manage your account preferences and privacy settings</p>
                </div>

                <Tabs
                    value={activeTab}
                    onValueChange={(value) => {
                        if (!tabOptions.includes(value)) return;
                        setActiveTab(value);
                        sessionStorage.setItem(TAB_STORAGE_KEY, value);
                        const nextParams = new URLSearchParams(searchParams);
                        nextParams.set("tab", value);
                        setSearchParams(nextParams, { replace: true });
                    }}
                    className="space-y-6"
                >
                    <div className="bg-white/[0.04] border border-white/10 rounded-2xl overflow-hidden">
                        <TabsList className="w-full bg-transparent rounded-none h-auto p-0">
                            <div
                                className="w-full rounded-xl bg-white/[0.04] border-b border-white/10 p-1 flex flex-row gap-1"
                            >
                                <TabsTrigger
                                    value="notifications"
                                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all text-white/45 data-[state=active]:bg-white/[0.10] data-[state=active]:text-white data-[state=active]:border data-[state=active]:border-white/15 data-[state=active]:shadow-none"
                                >
                                    Notifications
                                </TabsTrigger>
                                <TabsTrigger
                                    value="privacy"
                                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all text-white/45 data-[state=active]:bg-white/[0.10] data-[state=active]:text-white data-[state=active]:border data-[state=active]:border-white/15 data-[state=active]:shadow-none"
                                >
                                    Privacy
                                </TabsTrigger>
                                <TabsTrigger
                                    value="account"
                                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all text-white/45 data-[state=active]:bg-white/[0.10] data-[state=active]:text-white data-[state=active]:border data-[state=active]:border-white/15 data-[state=active]:shadow-none"
                                >
                                    Account
                                </TabsTrigger>
                                {showAppearance && (
                                    <TabsTrigger
                                        value="appearance"
                                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all text-white/45 data-[state=active]:bg-white/[0.10] data-[state=active]:text-white data-[state=active]:border data-[state=active]:border-white/15 data-[state=active]:shadow-none"
                                    >
                                        Appearance
                                    </TabsTrigger>
                                )}
                            </div>
                        </TabsList>
                    </div>

                <TabsContent value="notifications">
                    <Card className="home-card-tier2 rounded-2xl shadow-none hover:shadow-none">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-white">
                                <Bell className="h-5 w-5 text-white/70" />
                                Notification Preferences
                            </CardTitle>
                            <CardDescription className="text-white/50">
                                Choose how you want to be notified about activity
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label htmlFor="email-notif" className="text-white/80">Email Notifications</Label>
                                    <p className="text-sm text-white/45">Receive updates via email</p>
                                </div>
                                <Switch
                                    id="email-notif"
                                    checked={emailNotifications}
                                    onCheckedChange={(checked) => handleUpdateSetting({ email_notifications: checked })}
                                    disabled={isUpdating}
                                    className="border border-white/10 data-[state=checked]:bg-white/[0.22] data-[state=unchecked]:bg-white/[0.10] focus-visible:ring-white/20 focus-visible:ring-offset-0"
                                    thumbClassName="bg-white shadow-none"
                                />
                            </div>
                            <Separator className="bg-white/10" />

                            {/* Push Notifications - Real browser integration */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label htmlFor="push-notif" className="text-white/80">Push Notifications</Label>
                                        <p className="text-sm text-white/45">
                                            {!isPushSupported
                                                ? "Not supported in this browser"
                                                : !isPushConfigured
                                                    ? "Push notifications are not configured for this app"
                                                    : permissionState === 'denied'
                                                        ? "Blocked by browser - check site permissions"
                                                        : "Receive browser push notifications"
                                            }
                                        </p>
                                    </div>
                                    <Switch
                                        id="push-notif"
                                        checked={pushNotificationsEnabled}
                                        onCheckedChange={handlePushToggle}
                                        disabled={!isPushSupported || !isPushConfigured || permissionState === 'denied' || isPushLoading || isPushEnabling || isPushDisabling}
                                        className="border border-white/10 data-[state=checked]:bg-white/[0.22] data-[state=unchecked]:bg-white/[0.10] focus-visible:ring-white/20 focus-visible:ring-offset-0"
                                        thumbClassName="bg-white shadow-none"
                                    />
                                </div>

                                {/* Permission denied warning */}
                                {isPushSupported && permissionState === 'denied' && (
                                    <Alert className="bg-white/[0.04] border border-white/10 text-white/70">
                                        <AlertTriangle className="h-4 w-4 text-white/50" />
                                        <AlertDescription>
                                            Push notifications are blocked. Please enable them in your browser settings for this site.
                                        </AlertDescription>
                                    </Alert>
                                )}

                                {/* Not supported warning */}
                                {!isPushSupported && (
                                    <Alert className="bg-white/[0.04] border border-white/10 text-white/70">
                                        <AlertTriangle className="h-4 w-4 text-white/50" />
                                        <AlertDescription>
                                            Push notifications are not supported in this browser. Try using Chrome, Firefox, or Edge.
                                        </AlertDescription>
                                    </Alert>
                                )}

                                {isPushSupported && !isPushConfigured && (
                                    <Alert className="bg-white/[0.04] border border-white/10 text-white/70">
                                        <AlertTriangle className="h-4 w-4 text-white/50" />
                                        <AlertDescription>
                                            Push notifications are not set up yet. Add VITE_VAPID_PUBLIC_KEY to enable them.
                                        </AlertDescription>
                                    </Alert>
                                )}

                                {/* Test notification button */}
                                {pushNotificationsEnabled && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleSendTestNotification}
                                        disabled={isSendingTest}
                                        className="flex items-center gap-2 border border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white"
                                    >
                                        <Send className="h-4 w-4" />
                                        {isSendingTest ? "Sending..." : "Send Test Notification"}
                                    </Button>
                                )}
                            </div>

                            <Separator className="bg-white/10" />
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label htmlFor="message-notif" className="text-white/80">Message Notifications</Label>
                                    <p className="text-sm text-white/45">Get notified when you receive messages</p>
                                </div>
                                <Switch
                                    id="message-notif"
                                    checked={messageNotifications}
                                    onCheckedChange={(checked) => handleUpdateSetting({ message_notifications: checked })}
                                    disabled={isUpdating}
                                    className="border border-white/10 data-[state=checked]:bg-white/[0.22] data-[state=unchecked]:bg-white/[0.10] focus-visible:ring-white/20 focus-visible:ring-offset-0"
                                    thumbClassName="bg-white shadow-none"
                                />
                            </div>
                            <Separator className="bg-white/10" />
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label htmlFor="connection-notif" className="text-white/80">Connection Requests</Label>
                                    <p className="text-sm text-white/45">Get notified about new connection requests</p>
                                </div>
                                <Switch
                                    id="connection-notif"
                                    checked={connectionNotifications}
                                    onCheckedChange={(checked) => handleUpdateSetting({ connection_notifications: checked })}
                                    disabled={isUpdating}
                                    className="border border-white/10 data-[state=checked]:bg-white/[0.22] data-[state=unchecked]:bg-white/[0.10] focus-visible:ring-white/20 focus-visible:ring-offset-0"
                                    thumbClassName="bg-white shadow-none"
                                />
                            </div>
                            <p className="text-sm text-white/45">{saveStatusText}</p>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="privacy">
                    <Card className="home-card-tier2 rounded-2xl shadow-none hover:shadow-none">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-white">
                                <Shield className="h-5 w-5 text-white/70" />
                                Privacy Settings
                            </CardTitle>
                            <CardDescription className="text-white/50">
                                Control who can see your profile and activity
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                <Label className="text-white/80">Profile Visibility</Label>
                                <div className="grid gap-3">
                                    <div
                                        className={`p-4 border rounded-xl cursor-pointer transition-colors ${profileVisibility === "public"
                                            ? "border-white/20 bg-white/[0.06]"
                                            : "border-white/10 bg-white/[0.04] hover:bg-white/[0.06] hover:border-white/15"
                                            }`}
                                        onClick={() => !isUpdating && handleUpdateSetting({ profile_visibility: "public" })}
                                        aria-disabled={isUpdating}
                                    >
                                        <div className="font-medium text-white">Public</div>
                                        <p className="text-sm text-white/45">Anyone can view your profile</p>
                                    </div>
                                    <div
                                        className={`p-4 border rounded-xl cursor-pointer transition-colors ${profileVisibility === "connections"
                                            ? "border-white/20 bg-white/[0.06]"
                                            : "border-white/10 bg-white/[0.04] hover:bg-white/[0.06] hover:border-white/15"
                                            }`}
                                        onClick={() => !isUpdating && handleUpdateSetting({ profile_visibility: "connections" })}
                                        aria-disabled={isUpdating}
                                    >
                                        <div className="font-medium text-white">Connections Only</div>
                                        <p className="text-sm text-white/45">Only your connections can view your full profile</p>
                                    </div>
                                    <div
                                        className={`p-4 border rounded-xl cursor-pointer transition-colors ${profileVisibility === "private"
                                            ? "border-white/20 bg-white/[0.06]"
                                            : "border-white/10 bg-white/[0.04] hover:bg-white/[0.06] hover:border-white/15"
                                            }`}
                                        onClick={() => !isUpdating && handleUpdateSetting({ profile_visibility: "private" })}
                                        aria-disabled={isUpdating}
                                    >
                                        <div className="font-medium text-white">Private</div>
                                        <p className="text-sm text-white/45">Only you can view your profile details</p>
                                    </div>
                                </div>
                            </div>
                            <p className="text-sm text-white/45">{saveStatusText}</p>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="account">
                    <Card className="home-card-tier2 rounded-2xl shadow-none hover:shadow-none">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-white">
                                <Mail className="h-5 w-5 text-white/70" />
                                Account Settings
                            </CardTitle>
                            <CardDescription className="text-white/50">
                                Manage your account information
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Email Management — college + personal email transition */}
                            <EmailTransitionSettings />
                            <Separator className="bg-white/10" />
                            <div className="space-y-2">
                                <Label className="text-white/80">Password</Label>
                                <p className="text-sm text-white/45">••••••••</p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsPasswordDialogOpen(true)}
                                    className="border border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white"
                                >
                                    Change Password
                                </Button>
                            </div>
                            <Separator className="bg-white/10" />
                            <div className="space-y-2">
                                <Label className="text-white/80">Danger Zone</Label>
                                <p className="text-sm text-white/45">Deactivate your account and schedule data for deletion</p>
                                <AlertDialog
                                    open={deleteDialogOpen}
                                    onOpenChange={(open) => {
                                        if (!deactivateAccountMutation.isPending) {
                                            setDeleteDialogOpen(open);
                                            if (!open) setDeleteConfirmation("");
                                        }
                                    }}
                                >
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="border border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white"
                                        >
                                            Deactivate Account
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="bg-black border-white/10 text-white">
                                        <AlertDialogHeader>
                                            <AlertDialogTitle className="text-white">Deactivate your account?</AlertDialogTitle>
                                            <AlertDialogDescription className="text-white/60">
                                                Your account will be scheduled for permanent deletion in 15 days. Log back in before then to restore it. To confirm, type <span className="font-medium">DEACTIVATE</span> below.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>

                                        <div className="space-y-2">
                                            <Label htmlFor="delete-confirm" className="text-white/80">Confirmation</Label>
                                            <Input
                                                id="delete-confirm"
                                                value={deleteConfirmation}
                                                onChange={(e) => setDeleteConfirmation(e.target.value)}
                                                placeholder="Type DEACTIVATE"
                                                disabled={deactivateAccountMutation.isPending}
                                                autoComplete="off"
                                                className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/30 focus:border-white/25 focus:ring-white/10"
                                            />
                                        </div>

                                        <AlertDialogFooter>
                                            <AlertDialogCancel
                                                disabled={deactivateAccountMutation.isPending}
                                                className="border border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white"
                                            >
                                                Cancel
                                            </AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    void handleDeleteAccount();
                                                }}
                                                disabled={deactivateAccountMutation.isPending}
                                                className="bg-white/[0.10] text-white border border-white/15 hover:bg-white/[0.15]"
                                            >
                                                {deactivateAccountMutation.isPending ? "Deactivating…" : "Deactivate account"}
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {showAppearance && (
                    <TabsContent value="appearance">
                        <Card className="home-card-tier2 rounded-2xl shadow-none hover:shadow-none">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-white">
                                <Palette className="h-5 w-5 text-white/70" />
                                Appearance
                            </CardTitle>
                            <CardDescription className="text-white/50">
                                Customize how the app looks
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                <Label className="text-base font-medium text-white">Theme</Label>
                                <p className="text-sm text-white/50">Select your preferred color scheme</p>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {THEME_OPTIONS.map((option) => {
                                        const Icon = option.icon;
                                        const isSelected = theme === option.value;
                                        return (
                                            <button
                                                key={option.value}
                                                onClick={() => setTheme(option.value)}
                                                disabled={isThemeUpdating}
                                                className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border transition-colors ${isSelected
                                                    ? "border-white/20 bg-white/[0.06]"
                                                    : "border-white/10 bg-white/[0.04] hover:bg-white/[0.06] hover:border-white/15"
                                                    } ${isThemeUpdating ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                                            >
                                                {isSelected && (
                                                    <div className="absolute top-2 right-2">
                                                        <Check className="h-4 w-4 text-white/80" />
                                                    </div>
                                                )}
                                                <div className="p-3 rounded-full bg-white/[0.08] border border-white/10">
                                                    <Icon className="h-6 w-6 text-white/70" />
                                                </div>
                                                <div className="text-center">
                                                    <p className="font-medium text-white">{option.label}</p>
                                                    <p className="text-xs text-white/45 mt-0.5">{option.description}</p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <Separator className="bg-white/10" />
                            <div className="text-sm text-white/45">
                                <p>
                                    Your theme preference is saved to your account and will sync across all your devices.
                                </p>
                            </div>
                        </CardContent>
                        </Card>
                    </TabsContent>
                )}
            </Tabs>

            <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                <DialogContent className="bg-black border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle className="text-white">Change password</DialogTitle>
                        <DialogDescription className="text-white/60">
                            We'll email a secure password reset link to{" "}
                            <span className="font-medium">
                                {(() => {
                                    const isTransitioned = profile.email_transition_status === 'transitioned';
                                    return (isTransitioned && profile.personal_email) ? profile.personal_email : (profile.email ?? "your email");
                                })()}
                            </span>.
                        </DialogDescription>
                    </DialogHeader>

                    {!canSendPasswordReset && (
                        <div className="text-sm text-white/70">
                            This account doesn’t have a valid email address on file.
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsPasswordDialogOpen(false)}
                            disabled={isSendingReset}
                            className="border border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSendPasswordReset}
                            disabled={isSendingReset || !canSendPasswordReset}
                            className="bg-white/[0.10] text-white border border-white/15 hover:bg-white/[0.15]"
                        >
                            {isSendingReset ? "Sending…" : "Send reset link"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            </div>
        </div>
    );
};

export default Settings;
