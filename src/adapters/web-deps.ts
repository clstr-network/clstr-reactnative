/**
 * Web Adapter — Platform-specific dependency implementations.
 *
 * Core API functions accept optional callback parameters for
 * platform-specific behavior (image compression, native sharing, etc.).
 * This module provides the web implementations of those callbacks.
 *
 * Mobile adapter will provide React Native equivalents (e.g.
 * expo-image-manipulator for compression, RN Share for sharing).
 */

// ---------------------------------------------------------------------------
// Image compression — web canvas-based
// ---------------------------------------------------------------------------

/**
 * Compresses an image file using the browser Canvas API.
 * Conforms to the `CompressFileFn` type expected by
 * `@clstr/core/api/profile#uploadProfileAvatar`.
 *
 * Returns the file as-is if Canvas is unavailable or the file
 * is already below the threshold.
 */
export async function compressImageWeb(
  file: File,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.85,
): Promise<File> {
  // Skip non-image or already-small files
  if (!file.type.startsWith('image/') || file.size < 100_000) {
    return file;
  }

  return new Promise<File>((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Scale down preserving aspect ratio
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file); // fallback
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          resolve(new File([blob], file.name, { type: blob.type, lastModified: Date.now() }));
        },
        'image/webp',
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };

    img.src = url;
  });
}

// ---------------------------------------------------------------------------
// Share — Web Share API / clipboard fallback
// ---------------------------------------------------------------------------

export interface WebShareDeps {
  /** Base URL for generating share links (default: window.location.origin) */
  appUrl?: string;
}

/**
 * Shares content using the Web Share API, falling back to clipboard copy.
 * Returns true if sharing succeeded, false otherwise.
 */
export async function webShare(
  data: { title?: string; text?: string; url: string },
  _deps?: WebShareDeps,
): Promise<boolean> {
  try {
    if (navigator.share) {
      await navigator.share(data);
      return true;
    }
    // Fallback to clipboard
    await navigator.clipboard.writeText(data.url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns the current app origin for building share URLs.
 */
export function getWebAppUrl(): string {
  return typeof window !== 'undefined' ? window.location.origin : '';
}
