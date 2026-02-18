/**
 * Admin Alumni Invites Page
 *
 * Upload Excel → validate → bulk create invites → send emails.
 * View, filter, resend, cancel invites.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAlumniInvites } from "@/hooks/useAlumniInvites";
import { useAdmin } from "@/contexts/AdminContext";
import { supabase } from "@/integrations/supabase/client";
import { parseAlumniExcel, validateAlumniInviteRows, getValidationSummary } from "@/lib/alumni-invite-parser";
import { reviewAlumniInviteData, saveAIReviewResult } from "@/lib/ai-service";
import type { AIReviewOutput } from "@/types/ai";
import type { AlumniInviteFilters, AlumniInviteStatus, AlumniInviteValidationResult, ValidatedAlumniInviteRow } from "@/types/alumni-invite";
import {
  Upload, FileSpreadsheet, Search, Filter, RefreshCw, Send, Ban,
  CheckCircle2, Clock, AlertTriangle, XCircle, Users, Mail,
  ChevronLeft, ChevronRight, AlertCircle, ShieldAlert, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import { InviteOpsDashboard } from "@/components/admin/InviteOpsDashboard";

const STATUS_OPTIONS: { value: AlumniInviteStatus | "all"; label: string; icon: React.ReactNode }[] = [
  { value: "all", label: "All Statuses", icon: <Users className="w-3.5 h-3.5" /> },
  { value: "invited", label: "Invited", icon: <Mail className="w-3.5 h-3.5 text-blue-400" /> },
  { value: "accepted", label: "Accepted", icon: <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> },
  { value: "expired", label: "Expired", icon: <Clock className="w-3.5 h-3.5 text-yellow-400" /> },
  { value: "disputed", label: "Disputed", icon: <AlertTriangle className="w-3.5 h-3.5 text-orange-400" /> },
  { value: "cancelled", label: "Cancelled", icon: <XCircle className="w-3.5 h-3.5 text-red-400" /> },
];

function statusBadge(status: string) {
  const map: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; className: string }> = {
    invited: { variant: "default", className: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
    accepted: { variant: "default", className: "bg-green-500/20 text-green-300 border-green-500/30" },
    expired: { variant: "default", className: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" },
    disputed: { variant: "default", className: "bg-orange-500/20 text-orange-300 border-orange-500/30" },
    cancelled: { variant: "default", className: "bg-red-500/20 text-red-300 border-red-500/30" },
  };
  const cfg = map[status] ?? { variant: "outline" as const, className: "" };
  return (
    <Badge variant={cfg.variant} className={cfg.className}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

const PAGE_SIZE = 25;

/** Returns true if the invite was last sent within the past 24 hours */
function isResendOnCooldown(invite: { last_sent_at?: string | null }): boolean {
  if (!invite.last_sent_at) return false;
  const sentAt = new Date(invite.last_sent_at).getTime();
  return Date.now() - sentAt < 24 * 60 * 60 * 1000;
}

/** Returns human-readable remaining cooldown time, or null if not on cooldown */
function getCooldownRemaining(invite: { last_sent_at?: string | null }): string | null {
  if (!invite.last_sent_at) return null;
  const sentAt = new Date(invite.last_sent_at).getTime();
  const elapsed = Date.now() - sentAt;
  const cooldownMs = 24 * 60 * 60 * 1000;
  if (elapsed >= cooldownMs) return null;
  const remainMs = cooldownMs - elapsed;
  const hours = Math.floor(remainMs / (60 * 60 * 1000));
  const mins = Math.floor((remainMs % (60 * 60 * 1000)) / (60 * 1000));
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

const AdminAlumniInvites = () => {
  // ─── State ────────────────────────────────────────────────
  const { adminUser } = useAdmin();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [filters, setFilters] = useState<AlumniInviteFilters>({
    status: null,
    search: null,
    limit: PAGE_SIZE,
    offset: 0,
  });

  const {
    invites, total, isLoading, refetch,
    bulkUpload, isBulkUploading,
    resendInvite, isResending,
    cancelInvite, isCancelling,
    sendInviteEmail,
  } = useAlumniInvites(filters);

  // ─── Realtime: subscribe to alumni_invites changes ────────
  useEffect(() => {
    const channel = supabase
      .channel('admin-alumni-invites-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alumni_invites' },
        () => {
          // Refetch the invite list when any invite changes (accepted, expired, etc.)
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  // Upload state
  const [uploadStep, setUploadStep] = useState<"idle" | "parsed" | "reviewing" | "reviewed" | "uploading" | "done">("idle");
  const [parsedFile, setParsedFile] = useState<string>("");
  const [validationResults, setValidationResults] = useState<AlumniInviteValidationResult[]>([]);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showErrorsDialog, setShowErrorsDialog] = useState(false);

  // AI review state
  const [aiReview, setAiReview] = useState<AIReviewOutput | null>(null);
  const [excludedRows, setExcludedRows] = useState<Set<number>>(new Set());
  const [showAIWarnings, setShowAIWarnings] = useState(false);

  // ─── File upload ──────────────────────────────────────────
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
      ".xlsx", ".xls", ".csv"
    ];
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(ext ?? "")) {
      toast.error("Please upload an Excel (.xlsx, .xls) or CSV (.csv) file");
      return;
    }

    try {
      toast.info("Parsing file...");
      const rows = await parseAlumniExcel(file);
      const results = validateAlumniInviteRows(rows);
      const summary = getValidationSummary(results);

      setParsedFile(file.name);
      setValidationResults(results);
      setShowUploadDialog(true);

      if (summary.invalidCount > 0) {
        toast.warning(`${summary.invalidCount} rows have errors`);
      } else {
        toast.success(`${summary.validCount} valid rows ready for AI review`);
      }

      // ── AI Review step ──────────────────────────────────
      const validRows = results
        .filter((r) => r.valid && r.data)
        .map((r) => r.data as ValidatedAlumniInviteRow);

      if (validRows.length > 0) {
        setUploadStep("reviewing");
        toast.info("Running AI review on valid rows...");

        // Extract domain from first valid college email
        const firstDomain = validRows[0]?.college_email?.split("@")[1]?.toLowerCase() ?? null;

        // Map to AIReviewInputRow format
        const reviewRows = validRows.map((row, i) => ({
          row_index: i,
          college_email: row.college_email,
          personal_email: row.personal_email,
          full_name: row.full_name,
          grad_year: row.grad_year,
          degree: row.degree,
          major: row.major,
          status: "valid" as const,
        }));

        try {
          const reviewResult = reviewAlumniInviteData({
            college_id: validRows[0]?.college_id ?? null,
            expected_college_domain: firstDomain,
            rows: reviewRows,
          });

          setAiReview(reviewResult);

          // Pre-exclude rows flagged as probable_duplicate
          const autoExclude = new Set<number>();
          reviewResult.warnings
            .filter((w) => w.type === "probable_duplicate")
            .forEach((w) => autoExclude.add(w.row_index));
          setExcludedRows(autoExclude);

          setUploadStep("reviewed");

          if (reviewResult.warnings.length > 0) {
            toast.warning(`AI flagged ${reviewResult.warnings.length} potential issue${reviewResult.warnings.length > 1 ? "s" : ""}`);
          } else {
            toast.success("AI review passed — no issues found");
          }
        } catch (reviewErr) {
          console.error("AI review failed:", reviewErr);
          toast.warning("AI review could not be completed. You can still upload.");
          setUploadStep("reviewed");
          setAiReview(null);
        }
      } else {
        setUploadStep("parsed");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to parse file");
    }

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const resetUpload = useCallback(() => {
    setUploadStep("idle");
    setParsedFile("");
    setValidationResults([]);
    setAiReview(null);
    setExcludedRows(new Set());
    setShowAIWarnings(false);
  }, []);

  const handleBulkUpload = useCallback(async () => {
    if (!adminUser?.email) {
      toast.error("Admin session not found");
      return;
    }

    const validRows = validationResults
      .filter((r) => r.valid && r.data)
      .map((r) => r.data as ValidatedAlumniInviteRow)
      .filter((_, i) => !excludedRows.has(i)); // filter out AI-excluded rows

    if (validRows.length === 0) {
      toast.error("No valid rows to upload");
      return;
    }

    setUploadStep("uploading");

    try {
      // Persist AI review audit trail if we have one
      if (aiReview) {
        const allValid = validationResults
          .filter((r) => r.valid && r.data)
          .map((r) => r.data as ValidatedAlumniInviteRow);

        const firstDomain = allValid[0]?.college_email?.split("@")[1]?.toLowerCase() ?? "unknown";

        const decisions = allValid.map((row, i) => ({
          row_index: i,
          decision: (excludedRows.has(i) ? "exclude" : "accept") as "accept" | "exclude",
        }));

        const reviewInputForAudit = {
          college_id: allValid[0]?.college_id ?? null,
          expected_college_domain: firstDomain,
          rows: allValid.map((row, i) => ({
            row_index: i,
            college_email: row.college_email,
            personal_email: row.personal_email,
            full_name: row.full_name,
            grad_year: row.grad_year,
            degree: row.degree,
            major: row.major,
            status: "valid" as const,
          })),
        };

        await saveAIReviewResult(
          `${parsedFile}|${firstDomain}`,
          reviewInputForAudit,
          aiReview,
          decisions,
        ).catch((err) => console.error("Failed to save AI review audit:", err));
      }

      const result = await bulkUpload({
        rows: validRows,
        invitedBy: adminUser.email,
      });

      setUploadStep("done");

      toast.success(
        `Batch uploaded! ${result.inserted} invites created. Use "Send All" to deliver emails.`
      );

      setShowUploadDialog(false);
      resetUpload();
    } catch {
      setUploadStep("reviewed");
    }
  }, [validationResults, adminUser, bulkUpload, resetUpload, excludedRows, aiReview, parsedFile]);

  // ─── Pagination ───────────────────────────────────────────
  const currentPage = Math.floor((filters.offset ?? 0) / PAGE_SIZE) + 1;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const goToPage = (page: number) => {
    setFilters((f) => ({ ...f, offset: (page - 1) * PAGE_SIZE }));
  };

  // ─── Search debounce ─────────────────────────────────────
  const [searchInput, setSearchInput] = useState("");
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setFilters((f) => ({ ...f, search: value || null, offset: 0 }));
    }, 400);
  };

  // ─── Send all pending emails ──────────────────────────────
  const [isSendingAll, setIsSendingAll] = useState(false);
  const handleSendAllEmails = useCallback(async () => {
    const pending = invites.filter((i) => i.status === "invited");
    if (pending.length === 0) {
      toast.info("No pending invites to send");
      return;
    }

    setIsSendingAll(true);
    let sent = 0;
    let failed = 0;

    for (const invite of pending) {
      try {
        await sendInviteEmail(invite.personal_email, invite.token, invite.full_name);
        sent++;
      } catch {
        failed++;
      }
    }

    setIsSendingAll(false);
    toast.success(`Sent ${sent} emails${failed > 0 ? `, ${failed} failed` : ""}`);
  }, [invites, sendInviteEmail]);

  // ─── Validation summary ───────────────────────────────────
  const summary = getValidationSummary(validationResults);

  // ─── Render ───────────────────────────────────────────────
  return (
    <AdminLayout>
      <div className="space-y-6 text-admin-ink">
        {/* Ops Dashboard — pipeline health */}
        <InviteOpsDashboard />

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-admin-ink">Alumni Invites</h1>
            <p className="text-sm text-admin-ink-muted mt-1">
              Upload college alumni data and send invite links to personal emails
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="border-admin-border-strong text-admin-ink-secondary hover:text-admin-ink hover:bg-admin-bg-muted"
            >
              <RefreshCw className="w-4 h-4 mr-1.5" />
              Refresh
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleSendAllEmails}
              disabled={isSendingAll || invites.filter(i => i.status === "invited").length === 0}
              className="border-admin-primary-muted text-admin-primary hover:bg-admin-primary-light"
            >
              <Send className="w-4 h-4 mr-1.5" />
              {isSendingAll ? "Sending..." : "Send All Pending"}
            </Button>

            <Button
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="bg-admin-primary text-admin-ink hover:bg-admin-primary/90"
            >
              <Upload className="w-4 h-4 mr-1.5" />
              Upload Excel
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
        </div>

        {/* Server-side stats are displayed by InviteOpsDashboard above.
            Page-level context: total results matching current filter. */}
        <div className="flex items-center gap-2 text-xs text-admin-ink-muted">
          <Users className="w-3.5 h-3.5" />
          <span>{total} invite{total !== 1 ? 's' : ''} matching current filter</span>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-admin-ink-muted" />
            <Input
              placeholder="Search by name, email, or domain..."
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 bg-admin-bg-elevated border-admin-border-strong text-admin-ink placeholder:text-admin-ink-muted"
            />
          </div>

          <Select
            value={filters.status ?? "all"}
            onValueChange={(v) =>
              setFilters((f) => ({
                ...f,
                status: v === "all" ? null : (v as AlumniInviteStatus),
                offset: 0,
              }))
            }
          >
            <SelectTrigger className="w-44 bg-admin-bg-elevated border-admin-border-strong text-admin-ink">
              <Filter className="w-3.5 h-3.5 mr-2 text-admin-ink-muted" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  <div className="flex items-center gap-2">
                    {opt.icon}
                    {opt.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card className="bg-admin-bg-elevated border-admin-border">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full bg-admin-bg-subtle" />
                ))}
              </div>
            ) : invites.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-admin-ink-muted">
                <FileSpreadsheet className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">No invites found</p>
                <p className="text-xs mt-1">Upload an Excel file to get started</p>
              </div>
            ) : (
              <ScrollArea className="w-full">
                <Table>
                  <TableHeader>
                    <TableRow className="border-admin-border hover:bg-transparent">
                      <TableHead className="text-admin-ink-muted">Name</TableHead>
                      <TableHead className="text-admin-ink-muted">College Email</TableHead>
                      <TableHead className="text-admin-ink-muted">Personal Email</TableHead>
                      <TableHead className="text-admin-ink-muted">Domain</TableHead>
                      <TableHead className="text-admin-ink-muted">Grad Year</TableHead>
                      <TableHead className="text-admin-ink-muted">Status</TableHead>
                      <TableHead className="text-admin-ink-muted">Last Sent</TableHead>
                      <TableHead className="text-admin-ink-muted text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invites.map((invite) => (
                      <TableRow key={invite.id} className="border-admin-border hover:bg-admin-bg-muted">
                        <TableCell className="text-admin-ink font-medium">
                          {invite.full_name || "—"}
                        </TableCell>
                        <TableCell className="text-admin-ink-secondary text-xs font-mono">
                          {invite.college_email}
                        </TableCell>
                        <TableCell className="text-admin-ink-secondary text-xs font-mono">
                          {invite.personal_email}
                        </TableCell>
                        <TableCell className="text-admin-ink-muted text-xs">
                          {invite.college_domain}
                        </TableCell>
                        <TableCell className="text-admin-ink-muted">
                          {invite.grad_year || "—"}
                        </TableCell>
                        <TableCell>{statusBadge(invite.status)}</TableCell>
                        <TableCell className="text-admin-ink-muted text-xs">
                          {invite.last_sent_at
                            ? formatDistanceToNow(new Date(invite.last_sent_at), { addSuffix: true })
                            : formatDistanceToNow(new Date(invite.created_at), { addSuffix: true })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {invite.status === "invited" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => resendInvite(invite)}
                                  disabled={isResending || isResendOnCooldown(invite)}
                                  title={isResendOnCooldown(invite) ? `Cooldown: ${getCooldownRemaining(invite)} remaining. Last sent ${invite.last_sent_at ? formatDistanceToNow(new Date(invite.last_sent_at), { addSuffix: true }) : ''}.` : "Resend invite"}
                                  className="h-7 px-2 text-admin-primary hover:bg-admin-primary-light disabled:opacity-40"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => cancelInvite(invite.id)}
                                  disabled={isCancelling}
                                  className="h-7 px-2 text-admin-error hover:bg-admin-error-light"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                </Button>
                              </>
                            )}
                            {(invite.status === "expired" || invite.status === "cancelled") && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => resendInvite(invite)}
                                disabled={isResending || isResendOnCooldown(invite)}
                                title={isResendOnCooldown(invite) ? `Cooldown: ${getCooldownRemaining(invite)} remaining. Last sent ${invite.last_sent_at ? formatDistanceToNow(new Date(invite.last_sent_at), { addSuffix: true }) : ''}.` : "Re-invite"}
                                className="h-7 px-2 text-admin-primary hover:bg-admin-primary-light disabled:opacity-40"
                              >
                                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                                <span className="text-xs">Re-invite</span>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-admin-ink-muted">
              Showing {(filters.offset ?? 0) + 1}–{Math.min((filters.offset ?? 0) + PAGE_SIZE, total)} of {total}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => goToPage(currentPage - 1)}
                className="h-8 px-2 text-admin-ink-muted hover:text-admin-ink hover:bg-admin-bg-muted"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs text-admin-ink-muted px-2">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => goToPage(currentPage + 1)}
                className="h-8 px-2 text-admin-ink-muted hover:text-admin-ink hover:bg-admin-bg-muted"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Upload Preview Dialog ─────────────────────────── */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-2xl bg-admin-bg-elevated border-admin-border text-admin-ink">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-blue-400" />
              Upload Preview — {parsedFile}
            </DialogTitle>
            <DialogDescription className="text-admin-ink-muted">
              Review the parsed data before creating invites
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-admin-bg-subtle rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-admin-ink">{summary.total}</p>
                <p className="text-xs text-admin-ink-muted">Total Rows</p>
              </div>
              <div className="bg-green-500/10 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-400">{summary.validCount}</p>
                <p className="text-xs text-green-400/70">Valid</p>
              </div>
              <div className={`rounded-lg p-3 text-center ${summary.invalidCount > 0 ? "bg-red-500/10" : "bg-admin-bg-subtle"}`}>
                <p className={`text-2xl font-bold ${summary.invalidCount > 0 ? "text-red-400" : "text-admin-ink-muted"}`}>
                  {summary.invalidCount}
                </p>
                <p className="text-xs text-admin-ink-muted">Errors</p>
              </div>
            </div>

            {/* Error details */}
            {summary.invalidCount > 0 && (
              <Alert className="bg-red-500/10 border-red-500/20">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <AlertTitle className="text-red-300">Validation Errors</AlertTitle>
                <AlertDescription className="text-red-300/70 text-xs">
                  {summary.invalidCount} rows will be skipped.{" "}
                  <button
                    onClick={() => setShowErrorsDialog(true)}
                    className="underline hover:text-red-200"
                  >
                    View details
                  </button>
                </AlertDescription>
              </Alert>
            )}

            {/* AI Review Status */}
            {uploadStep === "reviewing" && (
              <Alert className="bg-blue-500/10 border-blue-500/20">
                <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
                <AlertTitle className="text-blue-300">AI Review in progress...</AlertTitle>
                <AlertDescription className="text-blue-300/70 text-xs">
                  Checking for anomalies, duplicates, and data quality issues.
                </AlertDescription>
              </Alert>
            )}

            {/* AI Review Warnings */}
            {aiReview && aiReview.warnings.length > 0 && uploadStep !== "reviewing" && (
              <Alert className="bg-yellow-500/10 border-yellow-500/20">
                <ShieldAlert className="w-4 h-4 text-yellow-400" />
                <AlertTitle className="text-yellow-300">
                  AI flagged {aiReview.warnings.length} issue{aiReview.warnings.length > 1 ? "s" : ""}
                </AlertTitle>
                <AlertDescription className="text-yellow-300/70 text-xs space-y-2">
                  <p>{excludedRows.size} row{excludedRows.size !== 1 ? "s" : ""} excluded. Review and toggle below.</p>
                  <button
                    onClick={() => setShowAIWarnings((v) => !v)}
                    className="underline hover:text-yellow-200 flex items-center gap-1"
                  >
                    <Eye className="w-3 h-3" />
                    {showAIWarnings ? "Hide" : "Show"} AI warnings
                  </button>
                  {showAIWarnings && (
                    <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto">
                      {aiReview.warnings.map((w, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between bg-admin-bg-subtle rounded px-2 py-1.5 text-xs"
                        >
                          <div className="flex-1 min-w-0">
                            <span className="text-yellow-400 font-medium">Row {w.row_index + 1}</span>
                            <span className="text-admin-ink-muted mx-1">·</span>
                            <span className="text-admin-ink-secondary">{w.type.replace(/_/g, " ")}</span>
                            <span className="text-admin-ink-muted mx-1">·</span>
                            <span className="text-admin-ink-muted truncate">{w.message}</span>
                          </div>
                          <button
                            onClick={() => {
                              setExcludedRows((prev) => {
                                const next = new Set(prev);
                                if (next.has(w.row_index)) {
                                  next.delete(w.row_index);
                                } else {
                                  next.add(w.row_index);
                                }
                                return next;
                              });
                            }}
                            className={`ml-2 shrink-0 px-2 py-0.5 rounded text-xs font-medium ${
                              excludedRows.has(w.row_index)
                                ? "bg-red-500/20 text-red-300 hover:bg-red-500/30"
                                : "bg-green-500/20 text-green-300 hover:bg-green-500/30"
                            }`}
                          >
                            {excludedRows.has(w.row_index) ? "Excluded" : "Included"}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {aiReview && aiReview.warnings.length === 0 && uploadStep !== "reviewing" && (
              <Alert className="bg-green-500/10 border-green-500/20">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <AlertTitle className="text-green-300">AI Review Passed</AlertTitle>
                <AlertDescription className="text-green-300/70 text-xs">
                  No anomalies detected. Data looks clean.
                </AlertDescription>
              </Alert>
            )}

            {/* Preview table */}
            <ScrollArea className="h-64 rounded border border-admin-border">
              <Table>
                <TableHeader>
                  <TableRow className="border-admin-border">
                    <TableHead className="text-admin-ink-muted text-xs">Row</TableHead>
                    <TableHead className="text-admin-ink-muted text-xs">Name</TableHead>
                    <TableHead className="text-admin-ink-muted text-xs">College Email</TableHead>
                    <TableHead className="text-admin-ink-muted text-xs">Personal Email</TableHead>
                    <TableHead className="text-admin-ink-muted text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validationResults.slice(0, 50).map((r) => (
                    <TableRow
                      key={r.row}
                      className={`border-admin-border ${!r.valid ? "bg-red-500/5" : ""}`}
                    >
                      <TableCell className="text-admin-ink-muted text-xs">{r.row}</TableCell>
                      <TableCell className="text-admin-ink text-xs">
                        {r.data?.full_name || "—"}
                      </TableCell>
                      <TableCell className="text-admin-ink-secondary text-xs font-mono">
                        {r.data?.college_email || "—"}
                      </TableCell>
                      <TableCell className="text-admin-ink-secondary text-xs font-mono">
                        {r.data?.personal_email || "—"}
                      </TableCell>
                      <TableCell>
                        {r.valid ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                        ) : (
                          <span className="text-xs text-red-400">{r.errors[0]}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
            {validationResults.length > 50 && (
              <p className="text-xs text-admin-ink-muted text-center">
                Showing first 50 of {validationResults.length} rows
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => { setShowUploadDialog(false); resetUpload(); }}
              className="border-admin-border-strong text-admin-ink-secondary hover:bg-admin-bg-muted"
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkUpload}
              disabled={isBulkUploading || uploadStep === "reviewing" || (summary.validCount - excludedRows.size) <= 0}
              className="bg-admin-primary text-admin-ink hover:bg-admin-primary/90"
            >
              {isBulkUploading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />
                  Uploading...
                </>
              ) : uploadStep === "reviewing" ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />
                  AI Reviewing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-1.5" />
                  Create {Math.max(0, summary.validCount - excludedRows.size)} Invites
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Error Details Dialog ──────────────────────────── */}
      <Dialog open={showErrorsDialog} onOpenChange={setShowErrorsDialog}>
        <DialogContent className="max-w-lg bg-admin-bg-elevated border-admin-border text-admin-ink">
          <DialogHeader>
            <DialogTitle className="text-red-400">Validation Errors</DialogTitle>
            <DialogDescription className="text-admin-ink-muted">
              These rows will be skipped during upload
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-80">
            <div className="space-y-2">
              {summary.invalidRows.map((r) => (
                <div key={r.row} className="bg-red-500/5 border border-red-500/10 rounded-lg p-3">
                  <p className="text-xs font-medium text-red-300">Row {r.row}</p>
                  <ul className="mt-1 space-y-0.5">
                    {r.errors.map((err, i) => (
                      <li key={i} className="text-xs text-red-400/70">• {err}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowErrorsDialog(false)} className="border-admin-border-strong text-admin-ink-secondary hover:bg-admin-bg-muted">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminAlumniInvites;
