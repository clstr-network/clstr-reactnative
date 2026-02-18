import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'https://clstr.network';
const PUBLIC_DIR = path.join(__dirname, '../public');

const staticRoutes = [
  '/',
  '/login',
  '/signup',
  '/about',
  '/clubs',
  '/events',
  '/mentorship',
  '/projects',
  '/jobs',
  '/ecocampus',
];

const generateSitemap = () => {
  const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${staticRoutes
    .map((route) => {
      return `
  <url>
    <loc>${BASE_URL}${route}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>${route === '/' ? 'daily' : 'weekly'}</changefreq>
    <priority>${route === '/' ? '1.0' : '0.8'}</priority>
  </url>`;
    })
    .join('')}
</urlset>`;

  fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap.xml'), sitemapContent);
  console.log('✅ Generic sitemap.xml generated in public directory');
};

generateSitemap();
