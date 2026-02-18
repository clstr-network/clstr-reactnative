import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_FILES = [
  { name: '.env', override: false },
  { name: '.env.local', override: true }
];

function parseLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) {
    return null;
  }
  const separatorIndex = trimmed.indexOf('=');
  if (separatorIndex === -1) {
    return null;
  }
  const key = trimmed.slice(0, separatorIndex).trim();
  const valuePart = trimmed.slice(separatorIndex + 1).trim();
  const sanitizedValue = valuePart.replace(/^['"]|['"]$/g, '');
  return { key, value: sanitizedValue };
}

export function loadEnvFiles(projectRoot, files = DEFAULT_FILES) {
  files.forEach(({ name, override }) => {
    const filePath = path.join(projectRoot, name);
    if (!fs.existsSync(filePath)) {
      return;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    content.split(/\r?\n/).forEach((line) => {
      const parsed = parseLine(line);
      if (!parsed) {
        return;
      }
      const { key, value } = parsed;
      if (override || !(key in process.env)) {
        process.env[key] = value;
      }
    });
  });
}
