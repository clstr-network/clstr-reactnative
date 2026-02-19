import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Edit3, Loader2, MessageSquare, MoreHorizontal, Globe, Linkedin, Twitter, Facebook, Instagram, ExternalLink, Share2, Palette, Eye, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { UserProfile } from "@clstr/shared/types/profile";
import { usePortfolioData, useActivatePortfolio } from "@/hooks/usePortfolio";
import { toast } from "@/hooks/use-toast";
import { UserBadge } from "@/components/ui/user-badge";
import { AvatarCropModal } from "@/components/profile/AvatarCropModal";

interface ProfileHeaderProps {
  profile: UserProfile;
  isCurrentUser: boolean;
  connectionStatus: string | null;
  canBypassMessageGate?: boolean;
  isConnecting: boolean;
  connectionsCount: string | number;
  postsCount: number;
  projectsCount: number;
  onConnect: () => void;
  onMessage: () => void;
  onEditProfile: () => void;
  onAvatarUpload?: (file: File) => void;
  isAvatarUploading?: boolean;
  onAvatarRemove?: () => void;
  isAvatarRemoving?: boolean;
  onTabChange?: (tab: string) => void;
}

const ProfileHeader = ({
  profile,
  isCurrentUser,
  connectionStatus,
  canBypassMessageGate = false,
  isConnecting,
  connectionsCount,
  postsCount,
  projectsCount,
  onConnect,
  onMessage,
  onEditProfile,
  onAvatarUpload,
  isAvatarUploading = false,
  onAvatarRemove,
  isAvatarRemoving = false,
  onTabChange,
}: ProfileHeaderProps) => {
  const [isAvatarPreviewOpen, setIsAvatarPreviewOpen] = useState(false);
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [isCropOpen, setIsCropOpen] = useState(false);
  const navigate = useNavigate();
  const portfolioData = usePortfolioData(profile);
  const activatePortfolio = useActivatePortfolio(profile.id, profile);

  const portfolioSlug = portfolioData?.settings.slug;
  const isPortfolioLive = portfolioData?.settings.isLive ?? false;

  const handleViewPortfolio = async () => {
    if (!isPortfolioLive) {
      // First time: activate, then open
      try {
        const slug = await activatePortfolio.mutateAsync();
        window.open(`/portfolio/${slug}`, "_blank");
      } catch {
        // Error toast handled by the mutation
      }
    } else if (portfolioSlug) {
      window.open(`/portfolio/${portfolioSlug}`, "_blank");
    }
  };

  const handleSharePortfolio = async () => {
    if (!portfolioSlug) return;
    const url = `${window.location.origin}/portfolio/${portfolioSlug}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied", description: "Portfolio link copied to clipboard." });
    } catch {
      toast({ title: "Copy failed", description: url, variant: "destructive" });
    }
  };

  const displayName = profile.full_name || "Community Member";
  const avatarUrl = profile.avatar_url ?? null;
  const socialLinks = (profile.social_links || {}) as Record<string, string>;

  const socialItems = [
    { key: "website", label: "Website", href: socialLinks.website, Icon: Globe },
    { key: "linkedin", label: "LinkedIn", href: socialLinks.linkedin, Icon: Linkedin },
    { key: "twitter", label: "Twitter", href: socialLinks.twitter, Icon: Twitter },
    { key: "facebook", label: "Facebook", href: socialLinks.facebook, Icon: Facebook },
    { key: "instagram", label: "Instagram", href: socialLinks.instagram, Icon: Instagram },
  ].filter((item) => Boolean(item.href));

  // Short bio — max 2 lines worth of text
  const shortBio = profile.bio
    ? profile.bio.length > 120
      ? profile.bio.slice(0, 120).trim() + "…"
      : profile.bio
    : null;

  const collegeLine = [profile.university, profile.branch || profile.major]
    .filter(Boolean)
    .join(" · ");
  const avatarInputId = `profile-avatar-upload-${profile.id}`;
  const canViewAvatar = Boolean(avatarUrl);
  const canManageAvatar = isCurrentUser && (Boolean(onAvatarUpload) || Boolean(onAvatarRemove));
  const canMessage = canBypassMessageGate || connectionStatus === "connected";

  const connectButtonLabel =
    connectionStatus === "connected"
      ? "Connected"
      : connectionStatus === "pending"
      ? "Pending"
      : "Connect";

  const isConnectDisabled =
    isConnecting || connectionStatus === "connected" || connectionStatus === "pending";

  /** Read selected file → open crop modal instead of uploading directly */
  const handleFileSelected = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setCropImage(reader.result as string);
      setIsCropOpen(true);
    };
    reader.readAsDataURL(file);
  };

  /** After cropping, send cropped file to the real upload handler */
  const handleCropSave = (croppedFile: File) => {
    setIsCropOpen(false);
    setCropImage(null);
    onAvatarUpload?.(croppedFile);
  };

  const handleCropClose = () => {
    setIsCropOpen(false);
    setCropImage(null);
  };

  return (
    <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4">
      {/* Top row: avatar + identity */}
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="relative flex-shrink-0 group">
          <Avatar
            className="h-24 w-24 border-2 border-white/10 bg-white/[0.06] shadow-none cursor-pointer"
            onClick={() => {
              if (isCurrentUser && onAvatarUpload && !isAvatarUploading) {
                document.getElementById(avatarInputId)?.click();
              } else if (canViewAvatar) {
                setIsAvatarPreviewOpen(true);
              }
            }}
          >
            <AvatarImage
              src={avatarUrl || undefined}
              alt={displayName}
              className="object-cover"
            />
            <AvatarFallback className="text-xl font-semibold text-white/70 bg-white/[0.08]">
              {displayName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>

          {/* Hover overlay — edit camera icon */}
          {isCurrentUser && onAvatarUpload && (
            <div
              className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center pointer-events-none"
            >
              {isAvatarUploading ? (
                <Loader2 className="h-5 w-5 text-white animate-spin" />
              ) : (
                <Camera className="h-5 w-5 text-white" />
              )}
            </div>
          )}

          {/* Hidden file input — opens crop modal on selection */}
          {isCurrentUser && onAvatarUpload && (
            <input
              id={avatarInputId}
              type="file"
              accept="image/*"
              className="hidden"
              disabled={isAvatarUploading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  handleFileSelected(file);
                }
                event.currentTarget.value = "";
              }}
            />
          )}
          {(canViewAvatar || canManageAvatar) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="absolute -top-1 -right-1 h-7 w-7 rounded-full border border-white/15 bg-white/[0.12] hover:bg-white/[0.18] text-white/80 flex items-center justify-center transition-colors"
                  aria-label="Profile picture options"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10 text-white rounded-xl">
                {canViewAvatar && (
                  <DropdownMenuItem
                    className="text-white/70 hover:text-white focus:text-white data-[highlighted]:bg-white/[0.08] data-[highlighted]:text-white focus:bg-white/[0.08] cursor-pointer gap-2 rounded-md"
                    onClick={() => setIsAvatarPreviewOpen(true)}
                  >
                    <Eye className="h-4 w-4" />
                    View Photo
                  </DropdownMenuItem>
                )}
                {isCurrentUser && onAvatarUpload && (
                  <DropdownMenuItem
                    className="text-white/70 hover:text-white focus:text-white data-[highlighted]:bg-white/[0.08] data-[highlighted]:text-white focus:bg-white/[0.08] cursor-pointer gap-2 rounded-md"
                    onClick={() => document.getElementById(avatarInputId)?.click()}
                    disabled={isAvatarUploading || isAvatarRemoving}
                  >
                    {isAvatarUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                    Edit Photo
                  </DropdownMenuItem>
                )}
                {isCurrentUser && onAvatarRemove && avatarUrl && (
                  <DropdownMenuItem
                    className="text-red-300 hover:text-red-200 focus:text-red-200 data-[highlighted]:bg-white/[0.08] data-[highlighted]:text-red-200 focus:bg-white/[0.08] cursor-pointer gap-2 rounded-md"
                    onClick={onAvatarRemove}
                    disabled={isAvatarUploading || isAvatarRemoving}
                  >
                    {isAvatarRemoving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Remove Photo
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Identity */}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-white truncate">
            {displayName}
          </h1>

          {shortBio && (
            <p className="text-sm text-white/60 mt-0.5 line-clamp-2 leading-snug">
              {shortBio}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            <UserBadge userType={profile.role} size="sm" />
            {collegeLine && (
              <span className="text-xs text-white/40 truncate">
                {collegeLine}
              </span>
            )}
          </div>
        </div>

        {socialItems.length > 0 && (
          <div className="ml-auto hidden md:flex flex-wrap items-center gap-2">
            {socialItems.map(({ key, label, href, Icon }) => (
              <a
                key={key}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="h-8 w-8 flex items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/60 hover:text-white hover:bg-white/[0.12] transition-colors"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-6 mt-5 px-1">
        <button
          className="flex flex-col items-center group"
          onClick={() => onTabChange?.("posts")}
        >
          <span className="text-lg font-bold text-white group-hover:text-white/80 transition-colors">
            {postsCount}
          </span>
          <span className="text-xs text-white/40 group-hover:text-white/50 transition-colors">
            Posts
          </span>
        </button>

        <button
          className={`flex flex-col items-center group ${isCurrentUser ? '' : 'cursor-default'}`}
          onClick={() => {
            if (!isCurrentUser) return;
            navigate(`/profile/${profile.id}/connections`);
          }}
        >
          <span className="text-lg font-bold text-white group-hover:text-white/80 transition-colors">
            {connectionsCount}
          </span>
          <span className="text-xs text-white/40 group-hover:text-white/50 transition-colors">
            Connections
          </span>
        </button>

        <button
          className="flex flex-col items-center group"
          onClick={() => onTabChange?.("projects")}
        >
          <span className="text-lg font-bold text-white group-hover:text-white/80 transition-colors">
            {projectsCount}
          </span>
          <span className="text-xs text-white/40 group-hover:text-white/50 transition-colors">
            Projects
          </span>
        </button>
      </div>

      {/* Action buttons */}
      <div className="mt-4">
        {isCurrentUser ? (
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 gap-2 h-10 rounded-xl border-white/15 bg-white/10 text-white hover:bg-white/[0.15] hover:text-white"
              onClick={onEditProfile}
            >
              <Edit3 className="h-4 w-4" />
              Edit Profile
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-xl border-white/15 bg-white/10 text-white/50 hover:bg-white/[0.15] hover:text-white"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10">
                <DropdownMenuItem
                  className="text-white/70 hover:text-white focus:text-white cursor-pointer gap-2"
                  onClick={() => navigate("/portfolio/editor")}
                >
                  <Palette className="h-4 w-4" />
                  Edit Portfolio
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-white/70 hover:text-white focus:text-white cursor-pointer gap-2"
                  onClick={handleViewPortfolio}
                >
                  <ExternalLink className="h-4 w-4" />
                  {isPortfolioLive ? "Open Portfolio" : "View Portfolio"}
                </DropdownMenuItem>
                {isPortfolioLive && (
                  <DropdownMenuItem
                    className="text-white/70 hover:text-white focus:text-white cursor-pointer gap-2"
                    onClick={handleSharePortfolio}
                  >
                    <Share2 className="h-4 w-4" />
                    Share Portfolio
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 gap-2 h-10 rounded-xl border-white/15 bg-white/10 text-white hover:bg-white/[0.15] hover:text-white"
              onClick={onConnect}
              disabled={isConnectDisabled}
            >
              {isConnecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {connectButtonLabel}
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2 h-10 rounded-xl border-white/15 bg-white/10 text-white hover:bg-white/[0.15] hover:text-white"
              onClick={onMessage}
              disabled={!canMessage}
              title={!canMessage ? "You can message only connected users." : undefined}
            >
              <MessageSquare className="h-4 w-4" />
              Message
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-xl border-white/15 bg-white/10 text-white/50 hover:bg-white/[0.15] hover:text-white"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10">
                {isPortfolioLive && portfolioSlug && (
                  <DropdownMenuItem
                    className="text-white/70 hover:text-white focus:text-white cursor-pointer gap-2"
                    onClick={() => window.open(`/portfolio/${portfolioSlug}`, "_blank")}
                  >
                    <ExternalLink className="h-4 w-4" />
                    View Portfolio
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      <Dialog open={isAvatarPreviewOpen} onOpenChange={setIsAvatarPreviewOpen}>
        <DialogContent className="sm:max-w-md bg-[#0a0a0a] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Profile Photo</DialogTitle>
          </DialogHeader>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={`${displayName} profile photo`}
              loading="lazy"
              className="w-full max-h-[70vh] object-contain rounded-lg border border-white/10"
            />
          ) : (
            <p className="text-sm text-white/60">No profile photo available.</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Crop modal */}
      {cropImage && (
        <AvatarCropModal
          image={cropImage}
          open={isCropOpen}
          onClose={handleCropClose}
          onSave={handleCropSave}
        />
      )}
    </div>
  );
};

export default ProfileHeader;
