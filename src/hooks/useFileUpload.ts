import { useState, useCallback } from 'react';

interface UseFileUploadOptions {
  maxFiles?: number;
  maxSize?: number;
  acceptedTypes?: string[];
}

export const useFileUpload = ({
  maxFiles = 10,
  maxSize = 10 * 1024 * 1024,
  acceptedTypes = []
}: UseFileUploadOptions = {}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const validateFile = useCallback((file: File): string | null => {
    if (file.size > maxSize) {
      return `${file.name} is too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB`;
    }

    if (acceptedTypes.length > 0 && !acceptedTypes.includes(file.type)) {
      return `${file.name} has an unsupported file type`;
    }

    return null;
  }, [maxSize, acceptedTypes]);

  const generatePreview = useCallback((file: File): Promise<string> => {
    return new Promise((resolve) => {
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      } else {
        resolve(''); // No preview for documents
      }
    });
  }, []);

  const addFiles = useCallback(async (newFiles: File[]) => {
    const errors: string[] = [];
    const validFiles: File[] = [];
    const newPreviews: string[] = [];

    for (const file of newFiles) {
      if (files.length + validFiles.length >= maxFiles) {
        errors.push(`Maximum ${maxFiles} files allowed`);
        break;
      }

      const error = validateFile(file);
      if (error) {
        errors.push(error);
      } else {
        validFiles.push(file);
        const preview = await generatePreview(file);
        newPreviews.push(preview);
      }
    }

    setValidationErrors(errors);
    setFiles(prev => [...prev, ...validFiles]);
    setPreviews(prev => [...prev, ...newPreviews]);
  }, [files.length, maxFiles, validateFile, generatePreview]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    addFiles(selectedFiles);
    e.target.value = '';
  }, [addFiles]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  }, [addFiles]);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
    setValidationErrors([]);
  }, []);

  const resetFiles = useCallback(() => {
    setFiles([]);
    setPreviews([]);
    setUploadProgress(0);
    setValidationErrors([]);
  }, []);

  return {
    files,
    previews,
    uploadProgress,
    isDragging,
    validationErrors,
    handleFileSelect,
    handleDrop,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    removeFile,
    resetFiles,
    setUploadProgress
  };
};
