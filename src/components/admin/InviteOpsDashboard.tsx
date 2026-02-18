/**
 * InviteOpsDashboard — Real-time operational stats for the alumni invite pipeline.
 *
 * Shows: invites created / accepted / expired, average accept latency,
 * pending expiring in 24h, and 7-day trends.
 *
 * Designed to be embedded in the Admin Alumni Invites page.
 */

import { useInviteOpsStats } from "@/hooks/useIdentity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users, CheckCircle2, Clock, AlertTriangle, XCircle, Mail,
  TrendingUp, Globe, Timer, AlertCircle
} from "lucide-react";

function StatCard({
  label,
  value,
  icon,
  trend,
  variant = "default",
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  variant?: "default" | "success" | "warning" | "danger";
}) {
  const variantClasses = {
    default: "border-admin-border",
    success: "border-green-500/30 bg-green-500/5",
    warning: "border-yellow-500/30 bg-yellow-500/5",
    danger: "border-red-500/30 bg-red-500/5",
  };

  return (
    <Card className={`${variantClasses[variant]} bg-admin-bg-elevated transition-colors`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-admin-ink-secondary text-xs font-medium uppercase tracking-wider">
            {icon}
            {label}
          </div>
          {trend && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {trend}
            </Badge>
          )}
        </div>
        <div className="mt-2 text-2xl font-bold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}

export function InviteOpsDashboard() {
  const { data: stats, isLoading, error } = useInviteOpsStats();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-admin-ink-secondary uppercase tracking-wider">
          Pipeline Health
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-3 w-20 mb-3" />
                <Skeleton className="h-7 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !stats) {
    const errorMsg = error instanceof Error ? error.message : '';
    const isAuthError = errorMsg.includes('Admin access required') || errorMsg.includes('Not authenticated');

    return (
      <Card className="border-red-500/30 bg-red-500/5">
        <CardContent className="p-4 flex items-center gap-2 text-admin-error text-sm">
          <AlertCircle className="w-4 h-4" />
          {isAuthError ? 'Admin access required to view pipeline stats' : 'Failed to load pipeline stats'}
        </CardContent>
      </Card>
    );
  }

  const acceptRate = stats.total_invites > 0
    ? Math.round((stats.accepted / stats.total_invites) * 100)
    : 0;

  const expiryRate = stats.total_invites > 0
    ? Math.round((stats.expired / stats.total_invites) * 100)
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-admin-ink-secondary uppercase tracking-wider">
          Pipeline Health
        </h3>
        <Badge variant="outline" className="text-[10px] text-admin-ink-secondary">
          Auto-refreshes every 60s
        </Badge>
      </div>

      {/* Primary stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        <StatCard
          label="Total Invites"
          value={stats.total_invites.toLocaleString()}
          icon={<Users className="w-3.5 h-3.5" />}
        />
        <StatCard
          label="Accepted"
          value={stats.accepted.toLocaleString()}
          icon={<CheckCircle2 className="w-3.5 h-3.5" />}
          trend={`${acceptRate}%`}
          variant="success"
        />
        <StatCard
          label="Pending"
          value={stats.invited.toLocaleString()}
          icon={<Mail className="w-3.5 h-3.5" />}
        />
        <StatCard
          label="Expired"
          value={stats.expired.toLocaleString()}
          icon={<Clock className="w-3.5 h-3.5" />}
          trend={expiryRate > 30 ? `${expiryRate}% ⚠` : `${expiryRate}%`}
          variant={expiryRate > 30 ? "warning" : "default"}
        />
        <StatCard
          label="Disputed"
          value={stats.disputed.toLocaleString()}
          icon={<AlertTriangle className="w-3.5 h-3.5" />}
          variant={stats.disputed > 0 ? "danger" : "default"}
        />
      </div>

      {/* Operational insights row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Avg Accept Time"
          value={stats.avg_accept_hours !== null ? `${stats.avg_accept_hours}h` : '—'}
          icon={<Timer className="w-3.5 h-3.5" />}
        />
        <StatCard
          label="Unique Domains"
          value={stats.unique_domains}
          icon={<Globe className="w-3.5 h-3.5" />}
        />
        <StatCard
          label="Accepted (7d)"
          value={stats.accepted_7d.toLocaleString()}
          icon={<TrendingUp className="w-3.5 h-3.5" />}
          trend={`${stats.accepted_today} today`}
          variant="success"
        />
        <StatCard
          label="Expiring in 24h"
          value={stats.pending_expiring_24h.toLocaleString()}
          icon={<AlertCircle className="w-3.5 h-3.5" />}
          variant={stats.pending_expiring_24h > 50 ? "warning" : "default"}
        />
      </div>
    </div>
  );
}
