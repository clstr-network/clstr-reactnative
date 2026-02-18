import { useRef, useState } from 'react';
import { Image, Video, FileText, Smile, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useProfile } from '@/contexts/ProfileContext';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { createPost } from '@/lib/social-api';
import { useToast } from '@/hooks/use-toast';

interface CreatePostCardProps {
  onPostCreated?: () => void;
}

export function CreatePostCard({ onPostCreated }: CreatePostCardProps) {
  const [postContent, setPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { profile } = useProfile();
  const { canPostInFeed } = useRolePermissions();
  const { toast } = useToast();

  const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

  const handlePickDocument = () => {
    fileInputRef.current?.click();
  };

  const handleDocumentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: 'Document too large',
        description: 'Maximum size is 20MB.',
        variant: 'destructive',
      });
      return;
    }

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

    if (file.type && !validTypes.includes(file.type)) {
      toast({
        title: 'Unsupported document type',
        description: 'Upload a PDF, Word, Excel, PowerPoint, or text file.',
        variant: 'destructive',
      });
      return;
    }

    setDocumentFile(file);
  };

  const clearDocument = () => {
    setDocumentFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCreatePost = async () => {
    if (!postContent.trim()) {
      toast({
        title: 'Post is empty',
        description: 'Please write something before posting',
        variant: 'destructive',
      });
      return;
    }

    setIsPosting(true);
    try {
      await createPost({
        content: postContent.trim(),
        attachment: documentFile ? { type: 'document', file: documentFile } : undefined,
      });

      toast({
        title: 'Post created',
        description: 'Your post has been shared with your network',
      });

      setPostContent('');
      clearDocument();
      onPostCreated?.();
    } catch (error: unknown) {
      console.error('Error creating post:', error);
      const description = error instanceof Error ? error.message : 'Please try again';
      toast({
        title: 'Failed to create post',
        description,
        variant: 'destructive',
      });
    } finally {
      setIsPosting(false);
    }
  };

  if (!canPostInFeed) {
    return null;
  }

  return (
    <Card className="p-3 md:p-4 space-y-3 md:space-y-4">
      <div className="flex gap-2 md:gap-3">
        <Avatar className="h-8 w-8 md:h-10 md:w-10 flex-shrink-0">
          <AvatarImage src={profile?.avatar_url || undefined} />
          <AvatarFallback className="text-xs md:text-sm">
            {profile?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
          </AvatarFallback>
        </Avatar>
        <Textarea
          placeholder="Share something with your network..."
          value={postContent}
          onChange={(e) => setPostContent(e.target.value)}
          className="resize-none min-h-[60px] md:min-h-[80px] text-sm md:text-base"
          disabled={isPosting}
        />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
        onChange={handleDocumentChange}
        disabled={isPosting}
      />

      {documentFile && (
        <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 p-3">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{documentFile.name}</p>
            <p className="text-xs text-white/60">
              {(documentFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={clearDocument}
            disabled={isPosting}
            aria-label="Remove document"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2">
        <div className="flex flex-wrap gap-1 md:gap-2">
          <Button variant="ghost" size="sm" disabled className="text-xs md:text-sm h-8 px-2 md:px-3">
            <Image className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1" />
            <span className="hidden xs:inline">Photo</span>
          </Button>
          <Button variant="ghost" size="sm" disabled className="text-xs md:text-sm h-8 px-2 md:px-3">
            <Video className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1" />
            <span className="hidden xs:inline">Video</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handlePickDocument}
            disabled={isPosting}
            className="text-xs md:text-sm h-8 px-2 md:px-3"
          >
            <FileText className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1" />
            <span className="hidden sm:inline">Document</span>
          </Button>
          <Button variant="ghost" size="sm" disabled className="text-xs md:text-sm h-8 px-2 md:px-3">
            <Smile className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1" />
            <span className="hidden sm:inline">Poll</span>
          </Button>
        </div>
        
        <Button
          onClick={handleCreatePost}
          disabled={!postContent.trim() || isPosting}
          className="bg-white/10 hover:bg-white/[0.15] w-full sm:w-auto text-sm md:text-base"
          size="sm"
        >
          {isPosting ? 'Posting...' : 'Post'}
        </Button>
      </div>
    </Card>
  );
}
