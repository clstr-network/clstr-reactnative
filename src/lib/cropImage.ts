/**
 * Crops an image to the specified pixel area and returns a File object.
 * Used by AvatarCropModal to produce a 1:1 cropped avatar before upload.
 */

interface PixelCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (err) => reject(err));
    image.src = url;
  });
}

/**
 * Crop and resize an image to the given pixel rect.
 * Returns a File suitable for direct upload (JPEG, ≤ 512×512).
 */
export async function getCroppedImage(
  imageSrc: string,
  pixelCrop: PixelCrop,
  fileName = "avatar.jpg",
  maxSize = 512,
): Promise<File> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");

  // Output at most maxSize × maxSize to keep file size small
  const outputSize = Math.min(pixelCrop.width, maxSize);
  canvas.width = outputSize;
  canvas.height = outputSize;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");

  // High-quality downscaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputSize,
    outputSize,
  );

  return new Promise<File>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Canvas export failed"));
          return;
        }
        resolve(new File([blob], fileName, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.9,
    );
  });
}
