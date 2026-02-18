import { ChangeEvent, useEffect, useMemo, useState } from "react";
import ReactPlayer from "react-player";
import { Image, Video, X, Loader2, Sparkles, FileUp } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { UserBadge } from "@/components/ui/user-badge";
import type { UserProfile } from "@/contexts/ProfileContext";

export type ComposerAttachment = {
  type: "image" | "video" | "document";
  src?: string;
  file?: File;
};

interface PostComposerProps {
  profile: UserProfile | null;
  onCreate: (payload: { content: string; attachment?: ComposerAttachment }) => Promise<void> | void;
}

type AssetType = "image" | "video" | "document" | null;

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

const PostComposer = ({ profile, onCreate }: PostComposerProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [assetType, setAssetType] = useState<AssetType>(null);
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  // release object URL when preview changes
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const avatarUrl = useMemo(() => profile?.avatar_url ?? null, [profile?.avatar_url]);

  const resetComposer = () => {
    setAssetType(null);
    setContent("");
    setImageFile(null);
    setImagePreview(null);
    setVideoUrl("");
    setDocumentFile(null);
    setFileError(null);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    resetComposer();
  };

  const openDialog = (type: AssetType = null) => {
    setAssetType(type);
    setIsDialogOpen(true);
  };

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setFileError(null);
    
    if (file.size > MAX_FILE_SIZE) {
      setFileError("File is too large. Maximum size is 20MB.");
      return;
    }
    
    if (!file.type.startsWith('image/')) {
      setFileError("Please select a valid image file.");
      return;
    }
    
    setImageFile(file);
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    setAssetType("image");
  };

  const handleDocumentChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setFileError(null);
    
    if (file.size > MAX_FILE_SIZE) {
      setFileError("File is too large. Maximum size is 20MB.");
      return;
    }
    
    // Accept common document types
    const validTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
    ];
    
    if (!validTypes.includes(file.type)) {
      setFileError("Please select a valid document (PDF, Word, Excel, PowerPoint, or text file).");
      return;
    }
    
    setDocumentFile(file);
    setAssetType("document");
  };

  const handlePost = async () => {
    if (!content.trim()) return;
    setIsPosting(true);

    let attachment: ComposerAttachment | undefined;

    if (assetType === "image" && imageFile) {
      attachment = { type: "image", src: imagePreview ?? undefined, file: imageFile };
    } else if (assetType === "video" && videoUrl.trim()) {
      attachment = { type: "video", src: videoUrl.trim() };
    } else if (assetType === "document" && documentFile) {
      attachment = { type: "document", file: documentFile };
    }

    try {
      await onCreate({ content: content.trim(), attachment });
      closeDialog();
    } catch (error) {
      console.error("Failed to create post", error);
      setFileError(error instanceof Error ? error.message : "Failed to create post. Please try again.");
    } finally {
      setIsPosting(false);
    }
  };

  const canPost = Boolean(content.trim()) && !isPosting;

  return (
    <div className="home-card-tier1 p-4 max-h-[120px] overflow-hidden">
      <div className="flex h-full flex-col gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="h-10 w-10">
            <AvatarImage src={avatarUrl || undefined} alt={profile?.full_name || "User"} />
            <AvatarFallback>
              {profile?.full_name?.split(" ").map(n => n[0]).join("") || "U"}
            </AvatarFallback>
          </Avatar>
          <Button
            variant="outline"
            className="flex-1 min-w-0 justify-start text-sm text-white/50 home-composer-trigger border-white/15 bg-white/4 hover:bg-white/6 hover:text-white/70 rounded-full h-[44px] shrink-0"
            onClick={() => openDialog(null)}
          >
            <span className="truncate">Share something with your network...</span>
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center sm:justify-between sm:gap-2 whitespace-nowrap shrink-0">
          <Button variant="ghost" size="sm" className="w-full justify-center text-xs sm:w-auto sm:justify-start sm:text-sm text-white/60 hover:text-white/90 hover:bg-white/6" onClick={() => openDialog("image")}>
            <Image className="mr-1.5 h-4 w-4" /> Photo
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-center text-xs sm:w-auto sm:justify-start sm:text-sm text-white/30 cursor-not-allowed" disabled title="Video posts coming soon (beta)">
            <Video className="mr-1.5 h-4 w-4" /> Video
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-center text-xs sm:w-auto sm:justify-start sm:text-sm text-white/30 cursor-not-allowed" disabled title="Document posts coming soon (beta)">
            <FileUp className="mr-1.5 h-4 w-4" /> Document
          </Button>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => (open ? setIsDialogOpen(true) : closeDialog())}>
        <DialogContent className="home-theme max-h-[90vh] overflow-y-auto sm:max-w-2xl bg-[#0a0a0a] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Create a post</DialogTitle>
            <DialogDescription>Start a conversation with alumni, mentors, and peers.</DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={avatarUrl || undefined} alt={profile?.full_name || "User"} />
              <AvatarFallback>
                {profile?.full_name?.split(" ").map(n => n[0]).join("") || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold">{profile?.full_name || "Guest Member"}</p>
              <UserBadge userType={profile?.role} size="sm" />
            </div>
          </div>

          <Textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="What do you want to talk about?"
            className="min-h-[140px]"
            autoFocus
          />

          {assetType === "image" && (
            <div className="space-y-3">
              <Label htmlFor="post-image" className="text-sm font-medium">
                Upload an image
              </Label>
              <Input id="post-image" type="file" accept="image/*" onChange={handleImageChange} />
              {imagePreview && (
                <div className="overflow-hidden rounded-lg border">
                  <img src={imagePreview} alt="Selected upload" className="h-64 w-full object-cover" />
                </div>
              )}
            </div>
          )}

          {assetType === "video" && (
            <div className="space-y-3">
              <Label htmlFor="post-video" className="text-sm font-medium">
                Share a video link
              </Label>
              <Input
                id="post-video"
                placeholder="https://www.youtube.com/watch?v=..."
                value={videoUrl}
                onChange={(event) => setVideoUrl(event.target.value)}
              />
              {videoUrl && (
                <div className="relative w-full overflow-hidden rounded-lg pb-[56.25%]">
                  <ReactPlayer src={videoUrl} width="100%" height="100%" controls style={{ position: "absolute", top: 0, left: 0 }} />
                </div>
              )}
            </div>
          )}

          {assetType === "document" && (
            <div className="space-y-3">
              <Label htmlFor="post-document" className="text-sm font-medium">
                Upload a document
              </Label>
              <Input 
                id="post-document" 
                type="file" 
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                onChange={handleDocumentChange}
              />
              {documentFile && (
                <div className="rounded-lg border bg-muted/50 p-4">
                  <div className="flex items-center gap-3">
                    <FileUp className="h-8 w-8 text-white/60" />
                    <div>
                      <p className="text-sm font-medium">{documentFile.name}</p>
                      <p className="text-xs text-white/60">
                        {(documentFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {fileError && (
            <div className="rounded-md border border-[#ef4444]/30 bg-[#ef4444]/10 p-3">
              <p className="text-sm text-[#ef4444]">{fileError}</p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 rounded-md border p-3">
            <span className="inline-flex items-center rounded-full bg-white/[0.06] px-3 py-1 text-xs font-semibold text-white/50">
              <Sparkles className="mr-1 h-3 w-3" /> AI tips available soon
            </span>
            <Button variant="ghost" size="sm" className="ml-auto text-white/60" onClick={resetComposer}>
              <X className="mr-1 h-4 w-4" /> Clear
            </Button>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={handlePost} disabled={!canPost} className="bg-white/15 text-white hover:bg-white/20 border border-white/15">
              {isPosting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Posting...
                </>
              ) : (
                "Post"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PostComposer;
