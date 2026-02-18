import { X, FileText, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MediaPreviewProps {
  previews: string[];
  files: File[];
  onRemove: (index: number) => void;
  uploadProgress?: number;
}

const MediaPreview = ({ previews, files, onRemove, uploadProgress }: MediaPreviewProps) => {
  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return null;
    if (file.type.startsWith('video/')) return null;
    if (file.type === 'application/pdf') return <FileText className="h-12 w-12 text-white/60" />;
    return <File className="h-12 w-12 text-white/60" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-2">
      <div className={cn(
        "grid gap-3",
        previews.length === 1 ? "grid-cols-1" : "grid-cols-2 md:grid-cols-3"
      )}>
        {previews.map((preview, index) => {
          const file = files[index];
          const isImage = file.type.startsWith('image/');
          const isVideo = file.type.startsWith('video/');
          
          return (
            <div
              key={index}
              className="relative group rounded-lg border bg-card overflow-hidden aspect-square"
            >
              {isImage && (
                <img
                  src={preview}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              )}
              
              {isVideo && (
                <video
                  src={preview}
                  className="w-full h-full object-cover"
                  muted
                />
              )}
              
              {!isImage && !isVideo && (
                <div className="w-full h-full flex flex-col items-center justify-center p-4 gap-2">
                  {getFileIcon(file)}
                  <p className="text-xs text-center font-medium truncate w-full">
                    {file.name}
                  </p>
                  <p className="text-xs text-white/60">
                    {formatFileSize(file.size)}
                  </p>
                </div>
              )}
              
              <Button
                size="icon"
                variant="destructive"
                className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(index);
                }}
              >
                <X className="h-4 w-4" />
              </Button>

              {uploadProgress !== undefined && uploadProgress < 100 && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                  <div className="text-center">
                    <div className="h-8 w-8 mx-auto mb-2 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <p className="text-xs font-medium">{uploadProgress}%</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MediaPreview;
