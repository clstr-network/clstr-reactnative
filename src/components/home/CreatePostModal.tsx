import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Image, Video, FileText, BarChart3, Send } from 'lucide-react';
import DragDropZone from './DragDropZone';
import MediaPreview from './MediaPreview';
import PollCreator from './PollCreator';
import { useFileUpload } from '@/hooks/useFileUpload';
import { toast } from '@/hooks/use-toast';
import { createPost } from '@/lib/social-api';

interface CreatePostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: 'text' | 'media' | 'document' | 'poll';
  onPostCreated?: (post: unknown) => void;
}

const CreatePostModal = ({ open, onOpenChange, defaultTab = 'text', onPostCreated }: CreatePostModalProps) => {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [postContent, setPostContent] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [pollQuestion, setPollQuestion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    files: mediaFiles,
    previews: previewUrls,
    uploadProgress,
    isDragging,
    validationErrors,
    handleFileSelect,
    handleDrop,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    removeFile,
    resetFiles
  } = useFileUpload({
    maxFiles: activeTab === 'media' ? 10 : 5,
    maxSize: activeTab === 'media' ? 100 * 1024 * 1024 : 25 * 1024 * 1024,
    acceptedTypes: activeTab === 'media' 
      ? ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm']
      : ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  });

  const isPostValid = () => {
    if (activeTab === 'text' || activeTab === 'media' || activeTab === 'document') {
      // Backend requires non-empty content; allow empty input only when a file is attached (we'll auto-generate content).
      return postContent.trim().length > 0 || mediaFiles.length > 0;
    }
    if (activeTab === 'poll') {
      return pollQuestion.trim().length > 0 && pollOptions.filter(opt => opt.trim().length > 0).length >= 2;
    }
    return false;
  };

  const handleSubmit = async () => {
    if (!isPostValid()) return;

    if ((activeTab === 'media' || activeTab === 'document') && mediaFiles.length > 1) {
      toast({
        title: 'Only one attachment supported',
        description: 'Please select a single file for now.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const trimmedContent = postContent.trim();

      const resolvedContent = (() => {
        if (activeTab === 'poll') return pollQuestion.trim();
        if (trimmedContent) return trimmedContent;
        if (mediaFiles.length > 0) {
          if (activeTab === 'document') return 'Shared a document';
          const file = mediaFiles[0];
          if (file?.type?.startsWith('image/')) return 'Shared a photo';
          if (file?.type?.startsWith('video/')) return 'Shared a video';
          return 'Shared an attachment';
        }
        return '';
      })();

      if (!resolvedContent) {
        toast({
          title: 'Post is empty',
          description: 'Add some text or attach a file.',
          variant: 'destructive',
        });
        return;
      }

      const attachment = (() => {
        const file = mediaFiles[0];
        if (!file) return undefined;

        if (activeTab === 'document') {
          return { type: 'document' as const, file };
        }

        if (file.type?.startsWith('image/')) {
          return { type: 'image' as const, file };
        }

        if (file.type?.startsWith('video/')) {
          return { type: 'video' as const, file };
        }

        return undefined;
      })();

      const poll = (() => {
        if (activeTab !== 'poll') return undefined;
        const options = pollOptions
          .map((value) => value.trim())
          .filter(Boolean)
          .slice(0, 6)
          .map((text) => ({ text, votes: 0 }));

        if (options.length < 2) return undefined;

        const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        return {
          question: pollQuestion.trim(),
          options,
          endDate,
        };
      })();

      const newPost = await createPost({
        content: resolvedContent,
        attachment,
        poll,
      });

      toast({
        title: "Post created successfully!",
        description: "Your post is now visible to your network.",
      });

      onPostCreated?.(newPost);
      handleClose();
    } catch (error) {
      console.error('Failed to create post', error);
      toast({
        title: "Failed to create post",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setPostContent('');
    setPollQuestion('');
    setPollOptions(['', '']);
    resetFiles();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Post</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'text' | 'media' | 'document' | 'poll')} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="text" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Text</span>
            </TabsTrigger>
            <TabsTrigger value="media" className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              <span className="hidden sm:inline">Media</span>
            </TabsTrigger>
            <TabsTrigger value="document" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Document</span>
            </TabsTrigger>
            <TabsTrigger value="poll" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Poll</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="space-y-4 mt-4">
            <Textarea
              placeholder="What's on your mind?"
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              className="min-h-[150px] resize-none"
            />
          </TabsContent>

          <TabsContent value="media" className="space-y-4 mt-4">
            <Textarea
              placeholder="Add a caption... (optional)"
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              className="min-h-[100px] resize-none"
            />
            <DragDropZone
              isDragging={isDragging}
              onDrop={handleDrop}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onFileSelect={handleFileSelect}
              accept="image/*,video/*"
              multiple
            />
            {validationErrors.length > 0 && (
              <div className="text-sm text-destructive">
                {validationErrors.map((error, i) => <div key={i}>{error}</div>)}
              </div>
            )}
            {previewUrls.length > 0 && (
              <MediaPreview
                previews={previewUrls}
                files={mediaFiles}
                onRemove={removeFile}
                uploadProgress={uploadProgress}
              />
            )}
          </TabsContent>

          <TabsContent value="document" className="space-y-4 mt-4">
            <Textarea
              placeholder="Add a description... (optional)"
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              className="min-h-[100px] resize-none"
            />
            <DragDropZone
              isDragging={isDragging}
              onDrop={handleDrop}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onFileSelect={handleFileSelect}
              accept=".pdf,.doc,.docx,.xls,.xlsx"
              multiple
            />
            {validationErrors.length > 0 && (
              <div className="text-sm text-destructive">
                {validationErrors.map((error, i) => <div key={i}>{error}</div>)}
              </div>
            )}
            {previewUrls.length > 0 && (
              <MediaPreview
                previews={previewUrls}
                files={mediaFiles}
                onRemove={removeFile}
                uploadProgress={uploadProgress}
              />
            )}
          </TabsContent>

          <TabsContent value="poll" className="space-y-4 mt-4">
            <PollCreator
              question={pollQuestion}
              options={pollOptions}
              onQuestionChange={setPollQuestion}
              onOptionsChange={setPollOptions}
            />
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!isPostValid() || isSubmitting}
            className="gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                Posting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Post
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePostModal;
