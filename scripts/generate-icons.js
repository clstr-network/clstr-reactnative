/**
 * generate-icons.js
 * One-time script to generate PWA icon sizes from the logo.
 * Creates a square dark-background icon with the logo centered.
 * 
 * Usage: node scripts/generate-icons.js
 * Requires: sharp (npm install -D sharp)
 */
import sharp from 'sharp';
import { mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const BG_COLOR = { r: 10, g: 10, b: 10, alpha: 1 }; // #0a0a0a
const ICONS_DIR = join(ROOT, 'public', 'icons');
const LOGO_PATH = join(ROOT, 'public', 'app-icon.svg'); // Square app icon

async function main() {
  if (!existsSync(ICONS_DIR)) {
    mkdirSync(ICONS_DIR, { recursive: true });
  }

  const logoMeta = await sharp(LOGO_PATH).metadata();
  console.log(`Source icon: ${logoMeta.width}x${logoMeta.height}`);

  const isSquare = logoMeta.width === logoMeta.height;

  for (const size of SIZES) {
    if (isSquare) {
      // Source is already square — just resize directly
      await sharp(LOGO_PATH)
        .resize(size, size, { fit: 'cover' })
        .png()
        .toFile(join(ICONS_DIR, `icon-${size}x${size}.png`));
    } else {
      // Non-square: place on dark background with padding
      const logoWidth = Math.round(size * 0.6);
      const resizedLogo = await sharp(LOGO_PATH)
        .resize({ width: logoWidth, fit: 'inside' })
        .toBuffer();

      const resizedMeta = await sharp(resizedLogo).metadata();
      const logoHeight = resizedMeta.height || logoWidth;
      const actualLogoWidth = resizedMeta.width || logoWidth;

      const left = Math.round((size - actualLogoWidth) / 2);
      const top = Math.round((size - logoHeight) / 2);

      await sharp({
        create: {
          width: size,
          height: size,
          channels: 4,
          background: BG_COLOR,
        },
      })
        .composite([{ input: resizedLogo, left, top }])
        .png()
        .toFile(join(ICONS_DIR, `icon-${size}x${size}.png`));
    }

    console.log(`✓ icon-${size}x${size}.png`);
  }

  console.log(`\nAll icons generated in public/icons/`);
}

main().catch((err) => {
  console.error('Icon generation failed:', err);
  process.exit(1);
});
