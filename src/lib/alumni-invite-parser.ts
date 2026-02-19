/**
 * alumni-invite-parser — Web adapter.
 * Re-exports core validation + adds web-only Excel parsing.
 */
export * from '@clstr/core/api/alumni-invite-parser';

// Web-only: File → parsed rows using xlsx (not in core — uses FileReader API)
import * as XLSX from 'xlsx';
import type { AlumniInviteUploadRow } from '@clstr/shared/types/alumni-invite';
import { normalizeColumnName } from '@clstr/core/api/alumni-invite-parser';

export function parseAlumniExcel(file: File): Promise<AlumniInviteUploadRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) { reject(new Error('Failed to read file')); return; }
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        if (!firstSheet) { reject(new Error('No data found in the file')); return; }
        const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '' });
        if (rawRows.length === 0) { reject(new Error('File is empty — no data rows found')); return; }
        const rows: AlumniInviteUploadRow[] = rawRows.map((raw) => {
          const normalized: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(raw)) {
            const mapped = normalizeColumnName(key);
            if (mapped) normalized[mapped] = value;
          }
          return {
            college_email: String(normalized.college_email ?? '').trim().toLowerCase(),
            personal_email: String(normalized.personal_email ?? '').trim().toLowerCase(),
            full_name: normalized.full_name ? String(normalized.full_name).trim() : undefined,
            grad_year: normalized.grad_year != null ? (normalized.grad_year as string | number) : undefined,
            degree: normalized.degree ? String(normalized.degree).trim() : undefined,
            major: normalized.major ? String(normalized.major).trim() : undefined,
            college_id: normalized.college_id ? String(normalized.college_id).trim() : undefined,
          };
        });
        resolve(rows);
      } catch (err) {
        reject(new Error(`Failed to parse file: ${err instanceof Error ? err.message : String(err)}`));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}
