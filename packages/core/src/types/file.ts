/**
 * Cross-platform file type for use in both web and React Native.
 *
 * On the web the caller passes a `Blob` (or `File`, which extends `Blob`).
 * On React Native the caller passes the `{ uri, type, name }` descriptor
 * that the Supabase storage client already accepts.
 */
export type CrossPlatformFile = Blob | { uri: string; type: string; name: string };

/**
 * Extract the MIME type from a CrossPlatformFile.
 */
export function getFileType(file: CrossPlatformFile): string {
  if (file instanceof Blob) return file.type;
  return file.type;
}

/**
 * Extract the file name from a CrossPlatformFile.
 * Falls back to a timestamp-based name for plain Blob instances.
 */
export function getFileName(file: CrossPlatformFile): string {
  if (file instanceof Blob) {
    return (file as File).name ?? `file-${Date.now()}`;
  }
  return file.name;
}

/**
 * Extract the file extension from a CrossPlatformFile.
 */
export function getFileExtension(file: CrossPlatformFile): string {
  const name = getFileName(file);
  return name.split('.').pop() ?? '';
}

/**
 * Get file size if available (Blob-based files only).
 * Returns undefined for RN-style descriptors where size isn't known at the type level.
 */
export function getFileSize(file: CrossPlatformFile): number | undefined {
  if (file instanceof Blob) return file.size;
  return undefined;
}
