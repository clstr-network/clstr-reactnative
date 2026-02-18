import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAdmin } from '@/contexts/AdminContext';
import { FOUNDER_EMAIL } from '@/lib/admin-constants';
import { useToast } from '@/hooks/use-toast';
import { 
  useAdminSettings, 
  useSystemInfo, 
  useMaintenanceMode, 
  useCacheManagement, 
  useApiKeyRotation 
} from '@/hooks/useAdminSettings';
import { supabase } from '@/integrations/supabase/client';
import { getAdminSetting, logAdminActivity } from '@/lib/admin-api';
import { 
  UserPlus,
  Shield,
  Trash2,
  Crown,
  User,
  Bell,
  Database,
  Download,
  AlertTriangle,
  ExternalLink,
  Key,
  Clock,
  Server,
  Zap,
  Save,
  RefreshCcw,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import AdminLayout from '@/components/admin/AdminLayout';

// Notification settings - these keys must match the DB schema in notification_rules
const notificationSettings = [
  { id: 'new-user', label: 'New User Signups', description: 'Get notified when new users join', enabled: true },
  { id: 'college-requests', label: 'College Domain Requests', description: 'New domain verification requests', enabled: true },
  { id: 'recruiter-signups', label: 'Recruiter Account Requests', description: 'When companies request access', enabled: true },
  { id: 'system-alerts', label: 'System Alerts', description: 'Critical system notifications', enabled: true },
  { id: 'weekly-summary', label: 'Weekly Summary', description: 'Weekly platform metrics digest', enabled: false },
  { id: 'monthly-report', label: 'Monthly Report', description: 'Detailed monthly analytics', enabled: true },
];

// Data settings - these keys must match the DB schema in data_anonymization
const dataSettings = [
  { id: 'anonymize-exports', label: 'Anonymize Data Exports', description: 'Remove PII from exported reports', enabled: true },
  { id: 'audit-logging', label: 'Audit Logging', description: 'Log all admin actions', enabled: true },
  { id: 'retention-30d', label: '30-Day Log Retention', description: 'Auto-delete logs older than 30 days', enabled: false },
  { id: 'gdpr-compliance', label: 'GDPR Compliance Mode', description: 'Enable enhanced data protection', enabled: true },
];

export default function AdminSettings() {
  const { adminUsers, addAdminUser, removeAdminUser, isFounder, isAdmin } = useAdmin();
  const { toast } = useToast();
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<'admin' | 'moderator'>('admin');
  const [addAdminDialogOpen, setAddAdminDialogOpen] = useState(false);
  const [notifications, setNotifications] = useState(notificationSettings);
  const [dataConfig, setDataConfig] = useState(dataSettings);
  const { settings, isLoading: settingsLoading, saveSettings, isSaving } = useAdminSettings();
  const { systemInfo, isLoading: systemInfoLoading } = useSystemInfo();
  const { maintenanceMode, toggleMaintenanceMode, isToggling: isTogglingMaintenance } = useMaintenanceMode();
  const { clearCache, isClearing: isClearingCache } = useCacheManagement();
  const { rotateApiKeys, isRotating: isRotatingKeys } = useApiKeyRotation();
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [exportingUsers, setExportingUsers] = useState(false);
  const [exportingLogs, setExportingLogs] = useState(false);
  const [purgingData, setPurgingData] = useState(false);

  const anonymizeExports = useMemo(() => {
    const setting = dataConfig.find((item) => item.id === 'anonymize-exports');
    return setting?.enabled ?? true;
  }, [dataConfig]);

  const retentionEnabled = useMemo(() => {
    const setting = dataConfig.find((item) => item.id === 'retention-30d');
    return setting?.enabled ?? false;
  }, [dataConfig]);

  // systemInfo is now provided by useSystemInfo() hook defined above

  const resolveExportPolicy = async () => {
    const policy = await getAdminSetting<{ maxRecords?: number; requireApproval?: boolean }>('export_thresholds');
    return {
      maxRecords: typeof policy?.maxRecords === 'number' && policy.maxRecords > 0 ? policy.maxRecords : 10000,
      requireApproval: policy?.requireApproval === true,
    };
  };

  const downloadJson = (data: unknown, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  // Toggle notification setting
  const toggleNotification = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, enabled: !n.enabled } : n)
    );
  };

  // Toggle data setting
  const toggleDataSetting = (id: string) => {
    setDataConfig(prev => 
      prev.map(d => d.id === id ? { ...d, enabled: !d.enabled } : d)
    );
  };

  // Handle add admin - now uses Supabase via context
  const handleAddAdmin = async () => {
    if (!newAdminEmail || !isFounder) return;
    
    setAddingAdmin(true);
    try {
      await addAdminUser(
        newAdminEmail.trim().toLowerCase(),
        newAdminName.trim() || newAdminEmail.split('@')[0],
        newAdminRole
      );
      
      toast({
        title: 'Admin Added',
        description: `${newAdminEmail} has been granted ${newAdminRole} access.`,
      });
      
      setNewAdminEmail('');
      setNewAdminName('');
      setNewAdminRole('admin');
      setAddAdminDialogOpen(false);
    } catch (error) {
      toast({
        title: 'Failed to Add Admin',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setAddingAdmin(false);
    }
  };

  // Handle remove admin - now uses Supabase via context
  const handleRemoveAdmin = async (email: string) => {
    try {
      await removeAdminUser(email);
      toast({
        title: 'Admin Removed',
        description: `${email} no longer has admin access.`,
      });
    } catch (error) {
      toast({
        title: 'Failed to Remove Admin',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  // Hydrate from persisted settings
  useEffect(() => {
    if (settingsLoading) return;

    setNotifications((prev) =>
      prev.map((notification) => ({
        ...notification,
        enabled: settings.notifications[notification.id] ?? notification.enabled,
      }))
    );

    setDataConfig((prev) =>
      prev.map((setting) => ({
        ...setting,
        enabled: settings.data[setting.id] ?? setting.enabled,
      }))
    );
  }, [settings, settingsLoading]);

  // Handle save settings
  const handleSaveSettings = async () => {
    if (!isFounder) {
      toast({
        title: 'Permission Denied',
        description: 'Only the founder can modify admin settings.',
        variant: 'destructive',
      });
      return;
    }

    const payload = {
      notifications: notifications.reduce<Record<string, boolean>>((acc, item) => {
        acc[item.id] = item.enabled;
        return acc;
      }, {}),
      data: dataConfig.reduce<Record<string, boolean>>((acc, item) => {
        acc[item.id] = item.enabled;
        return acc;
      }, {}),
    };

    try {
      await saveSettings(payload);
      toast({
        title: 'Settings Saved',
        description: 'Your preferences have been updated.',
      });
    } catch (error) {
      toast({
        title: 'Failed to Save Settings',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleExportUserData = async () => {
    if (!isFounder) {
      toast({
        title: 'Permission Denied',
        description: 'Only the founder can export full user data.',
        variant: 'destructive',
      });
      return;
    }

    setExportingUsers(true);
    try {
      const exportPolicy = await resolveExportPolicy();
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url, headline, bio, role, college_domain, is_verified, role_data, created_at, updated_at, last_seen')
        .neq('role', 'Club')
        .limit(exportPolicy.maxRecords);

      if (profilesError) throw profilesError;

      const userIds = (profiles || []).map((profile) => profile.id);

      const [studentProfiles, skills, userSettings] = await Promise.all([
        userIds.length
          ? supabase.from('student_profiles').select('user_id, graduation_year').in('user_id', userIds)
          : Promise.resolve({ data: [] as { user_id: string; graduation_year: number | null }[] }),
        userIds.length
          ? supabase.from('profile_skills').select('user_id, skill').in('user_id', userIds)
          : Promise.resolve({ data: [] as { user_id: string; skill: string }[] }),
        userIds.length
          ? supabase
              .from('user_settings')
              .select('user_id, profile_visibility, email_notifications, push_notifications, message_notifications, connection_notifications, created_at, updated_at')
              .in('user_id', userIds)
          : Promise.resolve({ data: [] as { user_id: string }[] }),
      ]);

      const graduationMap = new Map<string, number | null>();
      for (const row of studentProfiles.data || []) {
        graduationMap.set(row.user_id, row.graduation_year ?? null);
      }

      const skillsMap = new Map<string, string[]>();
      for (const row of skills.data || []) {
        const current = skillsMap.get(row.user_id) || [];
        current.push(row.skill);
        skillsMap.set(row.user_id, current);
      }

      const settingsMap = new Map<string, Record<string, unknown>>();
      for (const row of userSettings.data || []) {
        settingsMap.set(row.user_id, row as Record<string, unknown>);
      }

      const exportedUsers = (profiles || []).map((profile) => {
        const base = {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          headline: profile.headline,
          bio: profile.bio,
          role: profile.role,
          college_domain: profile.college_domain,
          is_verified: profile.is_verified,
          role_data: profile.role_data,
          last_seen: profile.last_seen,
          created_at: profile.created_at,
          updated_at: profile.updated_at,
          graduation_year: graduationMap.get(profile.id) ?? null,
          skills: skillsMap.get(profile.id) || [],
          user_settings: settingsMap.get(profile.id) || null,
        };

        if (!anonymizeExports) return base;

        return {
          ...base,
          email: null,
          full_name: null,
          avatar_url: null,
          headline: null,
          bio: null,
          role_data: null,
        };
      });

      downloadJson(
        {
          generated_at: new Date().toISOString(),
          anonymized: anonymizeExports,
          total_users: exportedUsers.length,
          users: exportedUsers,
        },
        `gdpr-user-export-${new Date().toISOString().split('T')[0]}.json`
      );

      await logAdminActivity('export_user_data', 'profiles', null, {
        anonymized: anonymizeExports,
        total_users: exportedUsers.length,
      });

      toast({
        title: 'Export Ready',
        description: 'User data export downloaded successfully.',
      });
    } catch (error) {
      console.error('Failed to export user data:', error);
      toast({
        title: 'Export Failed',
        description: 'Unable to export user data. Check your permissions.',
        variant: 'destructive',
      });
    } finally {
      setExportingUsers(false);
    }
  };

  const handleExportAuditLogs = async () => {
    setExportingLogs(true);
    try {
      if (!isFounder) {
        throw new Error('Only the founder can export audit logs');
      }

      const exportPolicy = await resolveExportPolicy();
      if (exportPolicy.requireApproval && !isFounder) {
        throw new Error('Export requires founder approval');
      }

      const { data, error } = await supabase
        .from('admin_activity_logs')
        .select('id, admin_email, action_type, target_type, target_id, details, ip_address, user_agent, created_at')
        .order('created_at', { ascending: false })
        .limit(exportPolicy.maxRecords);

      if (error) throw error;

      downloadJson(
        {
          generated_at: new Date().toISOString(),
          total_logs: data?.length || 0,
          logs: data || [],
        },
        `audit-logs-${new Date().toISOString().split('T')[0]}.json`
      );

      await logAdminActivity('export_audit_logs', 'admin_activity_logs', null, {
        total_logs: data?.length || 0,
      });

      toast({
        title: 'Audit Logs Exported',
        description: 'Audit logs downloaded successfully.',
      });
    } catch (error) {
      console.error('Failed to export audit logs:', error);
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Unable to export audit logs. Check your permissions.',
        variant: 'destructive',
      });
    } finally {
      setExportingLogs(false);
    }
  };

  const handlePurgeDeletedUsers = async () => {
    if (!isFounder) {
      toast({
        title: 'Permission Denied',
        description: 'Only the founder can purge deleted user data.',
        variant: 'destructive',
      });
      return;
    }

    const confirmed = window.confirm(
      'This will permanently remove deletion audit records older than 30 days. Continue?'
    );

    if (!confirmed) return;

    setPurgingData(true);
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);

      const { error } = await supabase
        .from('account_deletion_audit')
        .delete()
        .lt('created_at', cutoff.toISOString());

      if (error) throw error;

      await logAdminActivity('purge_deletion_audit', 'account_deletion_audit', null, {
        cutoff: cutoff.toISOString(),
      });

      toast({
        title: 'Purge Complete',
        description: retentionEnabled
          ? 'Deletion audit data older than 30 days has been purged.'
          : 'Deletion audit data older than 30 days has been purged.',
      });
    } catch (error) {
      console.error('Failed to purge deleted user data:', error);
      toast({
        title: 'Purge Failed',
        description: 'Unable to purge deleted user data. Check your permissions.',
        variant: 'destructive',
      });
    } finally {
      setPurgingData(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-500 text-sm">Manage admin access and platform settings</p>
          </div>
          <Button 
            onClick={handleSaveSettings}
            disabled={isSaving || !isFounder}
            className="bg-violet-600 hover:bg-violet-700"
          >
            {isSaving ? (
              <>
                <RefreshCcw className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>

        <Tabs defaultValue="admins" className="space-y-6">
          <TabsList className="bg-gray-100 border-gray-300">
            <TabsTrigger value="admins" className="data-[state=active]:bg-violet-600">
              <Shield className="w-4 h-4 mr-2" />
              Admin Users
            </TabsTrigger>
            <TabsTrigger value="notifications" className="data-[state=active]:bg-violet-600">
              <Bell className="w-4 h-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="data" className="data-[state=active]:bg-violet-600">
              <Database className="w-4 h-4 mr-2" />
              Data & Privacy
            </TabsTrigger>
            <TabsTrigger value="system" className="data-[state=active]:bg-violet-600">
              <Server className="w-4 h-4 mr-2" />
              System
            </TabsTrigger>
          </TabsList>

          {/* Admin Users Tab */}
          <TabsContent value="admins" className="space-y-6">
            <Card className="bg-white border-gray-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-gray-900">Admin Users</CardTitle>
                    <CardDescription className="text-gray-500">
                      Manage who has access to this admin dashboard
                    </CardDescription>
                  </div>
                  {isFounder && (
                    <Dialog open={addAdminDialogOpen} onOpenChange={setAddAdminDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="bg-violet-600 hover:bg-violet-700">
                          <UserPlus className="w-4 h-4 mr-2" />
                          Add Admin
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-white border-gray-200">
                        <DialogHeader>
                          <DialogTitle className="text-gray-900">Add Admin User</DialogTitle>
                          <DialogDescription className="text-gray-500">
                            Enter the details of the person you want to grant admin access to.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div>
                            <Label htmlFor="admin-email" className="text-gray-900">Email Address *</Label>
                            <Input
                              id="admin-email"
                              type="email"
                              value={newAdminEmail}
                              onChange={(e) => setNewAdminEmail(e.target.value)}
                              placeholder="name@gmail.com"
                              className="mt-2 bg-gray-100 border-gray-300 text-gray-900"
                            />
                          </div>
                          <div>
                            <Label htmlFor="admin-name" className="text-gray-900">Display Name</Label>
                            <Input
                              id="admin-name"
                              type="text"
                              value={newAdminName}
                              onChange={(e) => setNewAdminName(e.target.value)}
                              placeholder="John Doe"
                              className="mt-2 bg-gray-100 border-gray-300 text-gray-900"
                            />
                          </div>
                          <div>
                            <Label htmlFor="admin-role" className="text-gray-900">Role</Label>
                            <Select value={newAdminRole} onValueChange={(v: 'admin' | 'moderator') => setNewAdminRole(v)}>
                              <SelectTrigger className="mt-2 bg-gray-100 border-gray-300 text-gray-900">
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                              <SelectContent className="bg-gray-100 border-gray-300">
                                <SelectItem value="admin" className="text-gray-900">Admin (Full Access)</SelectItem>
                                <SelectItem value="moderator" className="text-gray-900">Moderator (Limited)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <p className="text-xs text-gray-500">
                            The user must sign in with this exact email to access the dashboard.
                          </p>
                        </div>
                        <DialogFooter>
                          <Button 
                            variant="outline" 
                            onClick={() => setAddAdminDialogOpen(false)}
                            className="border-gray-300 text-gray-700"
                          >
                            Cancel
                          </Button>
                          <Button 
                            onClick={handleAddAdmin}
                            disabled={!newAdminEmail.includes('@') || addingAdmin}
                            className="bg-violet-600 hover:bg-violet-700"
                          >
                            {addingAdmin ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Adding...
                              </>
                            ) : (
                              'Add Admin'
                            )}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Founder */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                        <Crown className="w-6 h-6 text-gray-900" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">Founder / CEO</p>
                          <Badge className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-gray-900 border-0 text-xs">
                            Founder
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500">{FOUNDER_EMAIL}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                      <Shield className="w-4 h-4" />
                      Full Access
                    </div>
                  </div>

                  <Separator className="bg-gray-100 my-4" />

                  {/* Other Admins */}
                  {adminUsers.filter(u => u.role !== 'founder').length === 0 ? (
                    <div className="text-center py-8">
                      <User className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500">No additional admins added yet</p>
                      {isFounder && (
                        <p className="text-sm text-gray-400 mt-1">
                          Click "Add Admin" to grant access to team members
                        </p>
                      )}
                    </div>
                  ) : (
                    adminUsers.filter(u => u.role !== 'founder').map((admin) => (
                      <div 
                        key={admin.id}
                        className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-300"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <User className="w-5 h-5 text-gray-500" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900">{admin.name || admin.email.split('@')[0]}</p>
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  "text-xs",
                                  admin.role === 'admin' 
                                    ? "bg-violet-100 text-violet-700 border-violet-300"
                                    : "bg-gray-100 text-gray-700 border-gray-300"
                                )}
                              >
                                {admin.role === 'admin' ? 'Admin' : 'Moderator'}
                              </Badge>
                              {!admin.is_active && (
                                <Badge variant="outline" className="bg-red-500/20 text-red-300 border-red-300 text-xs">
                                  Inactive
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">{admin.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-400">
                            Added {new Date(admin.added_at).toLocaleDateString()}
                          </span>
                          {isFounder && admin.is_active && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="text-red-600 hover:text-red-300 hover:bg-red-100"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="bg-white border-gray-200">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-gray-900">Remove Admin Access?</AlertDialogTitle>
                                  <AlertDialogDescription className="text-gray-500">
                                    This will revoke {admin.email}'s access to the admin dashboard. 
                                    They can be re-added later if needed.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="bg-gray-100 border-gray-300 text-gray-900 hover:bg-gray-200">
                                    Cancel
                                  </AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleRemoveAdmin(admin.email)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Remove Access
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {!isFounder && (
                  <div className="mt-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <div className="flex items-center gap-2 text-amber-400">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-sm font-medium">Limited Access</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Only the founder ({FOUNDER_EMAIL}) can add or remove admin users.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card className="bg-white border-gray-200">
              <CardHeader>
                <CardTitle className="text-gray-900">Email Notifications</CardTitle>
                <CardDescription className="text-gray-500">
                  Configure which notifications you want to receive
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {notifications.map((notification) => (
                  <div 
                    key={notification.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-gray-50"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{notification.label}</p>
                      <p className="text-sm text-gray-500">{notification.description}</p>
                    </div>
                    <Switch
                      checked={notification.enabled}
                      onCheckedChange={() => toggleNotification(notification.id)}
                      className="data-[state=checked]:bg-violet-600"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Data & Privacy Tab */}
          <TabsContent value="data" className="space-y-6">
            <Card className="bg-white border-gray-200">
              <CardHeader>
                <CardTitle className="text-gray-900">Data Protection Settings</CardTitle>
                <CardDescription className="text-gray-500">
                  Configure how user data is handled and protected
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {dataConfig.map((setting) => (
                  <div 
                    key={setting.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-gray-50"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{setting.label}</p>
                      <p className="text-sm text-gray-500">{setting.description}</p>
                    </div>
                    <Switch
                      checked={setting.enabled}
                      onCheckedChange={() => toggleDataSetting(setting.id)}
                      className="data-[state=checked]:bg-violet-600"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Data Export */}
            <Card className="bg-white border-gray-200">
              <CardHeader>
                <CardTitle className="text-admin-ink">Data Management</CardTitle>
                <CardDescription className="text-admin-ink-muted">
                  Export or manage platform data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  variant="outline"
                  className="w-full justify-start border-admin-border-strong text-admin-ink-secondary hover:bg-admin-bg-muted"
                  onClick={handleExportUserData}
                  disabled={exportingUsers}
                >
                  {exportingUsers ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Export All User Data (GDPR)
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start border-admin-border-strong text-admin-ink-secondary hover:bg-admin-bg-muted"
                  onClick={handleExportAuditLogs}
                  disabled={exportingLogs}
                >
                  {exportingLogs ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Export Audit Logs
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start border-red-300 text-red-600 hover:bg-red-100"
                  onClick={handlePurgeDeletedUsers}
                  disabled={purgingData}
                >
                  {purgingData ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  Purge Deleted User Data
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Tab */}
          <TabsContent value="system" className="space-y-6">
            <Card className="bg-admin-bg-elevated border-admin-border">
              <CardHeader>
                <CardTitle className="text-admin-ink">System Information</CardTitle>
                <CardDescription className="text-admin-ink-muted">
                  Current platform configuration and status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-admin-bg-muted">
                    <div className="flex items-center gap-2 text-admin-ink-muted mb-2">
                      <Zap className="w-4 h-4" />
                      <span className="text-sm">Version</span>
                    </div>
                    <p className="text-lg font-medium text-admin-ink">v{systemInfo.version}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-gray-50">
                    <div className="flex items-center gap-2 text-gray-500 mb-2">
                      <Server className="w-4 h-4" />
                      <span className="text-sm">Environment</span>
                    </div>
                    <p className="text-lg font-medium text-emerald-600">{systemInfo.environment}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-gray-50">
                    <div className="flex items-center gap-2 text-gray-500 mb-2">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">Last Deployment</span>
                    </div>
                    <p className="text-lg font-medium text-gray-900">
                      {systemInfo.lastDeployment ? systemInfo.lastDeployment.toLocaleDateString() : 'Not configured'}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-gray-50">
                    <div className="flex items-center gap-2 text-gray-500 mb-2">
                      <Database className="w-4 h-4" />
                      <span className="text-sm">Region</span>
                    </div>
                    <p className="text-lg font-medium text-gray-900">{systemInfo.region}</p>
                  </div>
                </div>

                <Separator className="bg-gray-100 my-6" />

                {/* Supabase Project */}
                <div className="p-4 rounded-xl bg-admin-bg-muted">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-admin-ink-muted">Supabase Project</p>
                      <p className="text-admin-ink font-medium">{systemInfo.supabaseProject}</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="border-admin-border-strong text-admin-ink-secondary hover:bg-admin-bg-muted"
                      onClick={() => {
                        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                        if (supabaseUrl) {
                          const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
                          window.open(`https://supabase.com/dashboard/project/${projectRef}`, '_blank');
                        } else {
                          window.open('https://supabase.com/dashboard', '_blank');
                        }
                      }}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open Dashboard
                    </Button>
                  </div>
                </div>

                <Separator className="bg-admin-border my-6" />

                {/* Maintenance Mode Status */}
                {maintenanceMode.enabled && (
                  <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 mb-6">
                    <div className="flex items-center gap-2 text-yellow-600 mb-2">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="font-medium">Maintenance Mode Active</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Enabled by {maintenanceMode.enabled_by || 'Unknown'} at{' '}
                      {maintenanceMode.enabled_at ? new Date(maintenanceMode.enabled_at).toLocaleString() : 'Unknown time'}
                    </p>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-admin-ink">Quick Actions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Button 
                      variant="outline" 
                      className="justify-start border-admin-border-strong text-admin-ink-secondary hover:bg-admin-bg-muted"
                      onClick={async () => {
                        if (!isFounder) {
                          toast({
                            title: 'Permission Denied',
                            description: 'Only the founder can clear cache.',
                            variant: 'destructive',
                          });
                          return;
                        }
                        try {
                          await clearCache();
                          toast({
                            title: 'Cache Cleared',
                            description: 'All application caches have been cleared successfully.',
                          });
                        } catch (error) {
                          toast({
                            title: 'Failed to Clear Cache',
                            description: error instanceof Error ? error.message : 'An error occurred',
                            variant: 'destructive',
                          });
                        }
                      }}
                      disabled={isClearingCache || !isFounder}
                    >
                      {isClearingCache ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCcw className="w-4 h-4 mr-2" />
                      )}
                      Clear Cache
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="justify-start border-admin-border-strong text-admin-ink-secondary hover:bg-admin-bg-muted"
                          disabled={isRotatingKeys || !isFounder}
                        >
                          {isRotatingKeys ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Key className="w-4 h-4 mr-2" />
                          )}
                          Rotate API Keys
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-white border-gray-200">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-gray-900">Rotate API Keys?</AlertDialogTitle>
                          <AlertDialogDescription className="text-gray-500">
                            This will record a key rotation request. Actual API key rotation must be done in the Supabase Dashboard.
                            After rotating keys, update your environment variables.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-gray-100 border-gray-300 text-gray-900 hover:bg-gray-200">
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={async () => {
                              try {
                                await rotateApiKeys();
                                toast({
                                  title: 'API Key Rotation Recorded',
                                  description: 'Please complete the rotation in Supabase Dashboard and update environment variables.',
                                });
                              } catch (error) {
                                toast({
                                  title: 'Failed to Record Rotation',
                                  description: error instanceof Error ? error.message : 'An error occurred',
                                  variant: 'destructive',
                                });
                              }
                            }}
                            className="bg-violet-600 hover:bg-violet-700"
                          >
                            Record Rotation
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <Button 
                      variant="outline" 
                      className="justify-start border-admin-border-strong text-admin-ink-secondary hover:bg-admin-bg-muted"
                      onClick={() => {
                        window.open('https://supabase.com/dashboard/project/_/database/migrations', '_blank');
                        toast({
                          title: 'Opening Migrations',
                          description: 'Redirecting to Supabase Dashboard for migrations.',
                        });
                      }}
                    >
                      <Database className="w-4 h-4 mr-2" />
                      Run Migrations
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          className={cn(
                            "justify-start",
                            maintenanceMode.enabled
                              ? "border-green-300 text-green-600 hover:bg-green-100"
                              : "border-yellow-300 text-yellow-600 hover:bg-yellow-100"
                          )}
                          disabled={isTogglingMaintenance || !isFounder}
                        >
                          {isTogglingMaintenance ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 mr-2" />
                          )}
                          {maintenanceMode.enabled ? 'Disable Maintenance' : 'Enable Maintenance'}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-white border-gray-200">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-gray-900">
                            {maintenanceMode.enabled ? 'Disable Maintenance Mode?' : 'Enable Maintenance Mode?'}
                          </AlertDialogTitle>
                          <AlertDialogDescription className="text-gray-500">
                            {maintenanceMode.enabled
                              ? 'This will restore normal platform access for all users.'
                              : 'This will display a maintenance message to all users. Only admins will be able to access the platform.'}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-gray-100 border-gray-300 text-gray-900 hover:bg-gray-200">
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={async () => {
                              try {
                                await toggleMaintenanceMode(!maintenanceMode.enabled);
                                toast({
                                  title: maintenanceMode.enabled ? 'Maintenance Mode Disabled' : 'Maintenance Mode Enabled',
                                  description: maintenanceMode.enabled
                                    ? 'Platform is now accessible to all users.'
                                    : 'Users will see a maintenance message.',
                                });
                              } catch (error) {
                                toast({
                                  title: 'Failed to Toggle Maintenance Mode',
                                  description: error instanceof Error ? error.message : 'An error occurred',
                                  variant: 'destructive',
                                });
                              }
                            }}
                            className={maintenanceMode.enabled ? "bg-green-600 hover:bg-green-700" : "bg-yellow-600 hover:bg-yellow-700"}
                          >
                            {maintenanceMode.enabled ? 'Disable' : 'Enable'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                {!isFounder && (
                  <div className="mt-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <div className="flex items-center gap-2 text-amber-600">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-sm font-medium">Limited Access</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Only the founder ({FOUNDER_EMAIL}) can perform system actions.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
