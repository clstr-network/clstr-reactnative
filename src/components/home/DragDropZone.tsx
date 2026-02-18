import { useRef } from 'react';
import { Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DragDropZoneProps {
  isDragging: boolean;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnter: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  accept?: string;
  multiple?: boolean;
}

const DragDropZone = ({
  isDragging,
  onDrop,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onFileSelect,
  accept = '*',
  multiple = true
}: DragDropZoneProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      onDrop={onDrop}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onClick={() => fileInputRef.current?.click()}
      className={cn(
        "relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all",
        "hover:border-primary hover:bg-accent/50",
        isDragging ? "border-primary bg-accent border-solid" : "border-border"
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        onChange={onFileSelect}
        accept={accept}
        multiple={multiple}
        className="hidden"
      />
      
      <div className="flex flex-col items-center gap-3">
        <div className={cn(
          "p-4 rounded-full transition-colors",
          isDragging ? "bg-primary text-primary-foreground" : "bg-accent text-white/60"
        )}>
          <Upload className="h-8 w-8" />
        </div>
        
        <div className="space-y-1">
          <p className="text-sm font-medium">
            {isDragging ? "Drop files here" : "Drag and drop files here"}
          </p>
          <p className="text-xs text-white/60">
            or click to browse
          </p>
        </div>
      </div>
    </div>
  );
};

export default DragDropZone;
