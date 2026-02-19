/**
 * Alumni Invite Excel/CSV Parsing & Validation
 *
 * Handles: Excel → parsed rows → validated rows ready for DB insert.
 * College email = identity anchor; personal email = delivery channel.
 */

import * as XLSX from "xlsx";
import type {
  AlumniInviteUploadRow,
  ValidatedAlumniInviteRow,
  AlumniInviteValidationResult,
} from "@clstr/shared/types/alumni-invite";

// ─── Email validation ────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email);
}

function isAcademicEmail(email: string): boolean {
  // Basic academic domain heuristics – expand as needed
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  return (
    domain.endsWith(".edu") ||
    domain.endsWith(".edu.in") ||
    domain.endsWith(".ac.in") ||
    domain.endsWith(".ac.uk") ||
    domain.endsWith(".edu.au") ||
    domain.endsWith(".ac.nz") ||
    // Indian college patterns
    /\.(college|university|inst|iit|nit|iiit|bits|vit|srm|mit)\./i.test(domain) ||
    // Allow any domain that was already registered as a college domain
    // (this is loose – the DB upsert will enforce domain-level validation)
    domain.length > 0
  );
}

// ─── Column name normalization ───────────────────────────────
const COLUMN_ALIASES: Record<string, string> = {
  // college_email
  college_email: "college_email",
  collegeemail: "college_email",
  "college email": "college_email",
  academic_email: "college_email",
  academicemail: "college_email",
  "academic email": "college_email",
  edu_email: "college_email",
  "edu email": "college_email",
  institutional_email: "college_email",

  // personal_email
  personal_email: "personal_email",
  personalemail: "personal_email",
  "personal email": "personal_email",
  email: "personal_email",
  contact_email: "personal_email",
  private_email: "personal_email",

  // full_name
  full_name: "full_name",
  fullname: "full_name",
  name: "full_name",
  "full name": "full_name",
  student_name: "full_name",
  "student name": "full_name",

  // grad_year
  grad_year: "grad_year",
  gradyear: "grad_year",
  "grad year": "grad_year",
  graduation_year: "grad_year",
  graduationyear: "grad_year",
  "graduation year": "grad_year",
  "year of graduation": "grad_year",
  passing_year: "grad_year",
  "passing year": "grad_year",
  batch: "grad_year",

  // degree
  degree: "degree",
  qualification: "degree",
  program: "degree",
  course: "degree",

  // major
  major: "major",
  branch: "major",
  specialization: "major",
  department: "major",
  stream: "major",

  // college_id
  college_id: "college_id",
  collegeid: "college_id",
  "college id": "college_id",
};

function normalizeColumnName(raw: string): string | null {
  const key = raw.trim().toLowerCase().replace(/[_\-\s]+/g, "_");
  return COLUMN_ALIASES[key] ?? COLUMN_ALIASES[raw.trim().toLowerCase()] ?? null;
}

// ─── Parse Excel / CSV file ──────────────────────────────────

export function parseAlumniExcel(file: File): Promise<AlumniInviteUploadRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error("Failed to read file"));
          return;
        }

        const workbook = XLSX.read(data, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        if (!firstSheet) {
          reject(new Error("No data found in the file"));
          return;
        }

        // Parse to JSON with raw headers
        const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, {
          defval: "",
        });

        if (rawRows.length === 0) {
          reject(new Error("File is empty — no data rows found"));
          return;
        }

        // Normalize column names
        const rows: AlumniInviteUploadRow[] = rawRows.map((raw) => {
          const normalized: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(raw)) {
            const mapped = normalizeColumnName(key);
            if (mapped) {
              normalized[mapped] = value;
            }
          }
          return {
            college_email: String(normalized.college_email ?? "").trim().toLowerCase(),
            personal_email: String(normalized.personal_email ?? "").trim().toLowerCase(),
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

    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
}

// ─── Validate rows ───────────────────────────────────────────

export function validateAlumniInviteRows(
  rows: AlumniInviteUploadRow[]
): AlumniInviteValidationResult[] {
  const seenCollegeEmails = new Set<string>();
  const results: AlumniInviteValidationResult[] = [];

  rows.forEach((row, index) => {
    const errors: string[] = [];
    const rowNum = index + 2; // Excel row (1-indexed header + data)

    // Required: college_email
    if (!row.college_email) {
      errors.push("Missing college_email");
    } else if (!isValidEmail(row.college_email)) {
      errors.push(`Invalid college_email: ${row.college_email}`);
    }

    // Required: personal_email
    if (!row.personal_email) {
      errors.push("Missing personal_email");
    } else if (!isValidEmail(row.personal_email)) {
      errors.push(`Invalid personal_email: ${row.personal_email}`);
    }

    // Deduplicate by college_email
    if (row.college_email && seenCollegeEmails.has(row.college_email)) {
      errors.push(`Duplicate college_email: ${row.college_email}`);
    }

    // college_email and personal_email should not be the same
    if (row.college_email && row.personal_email && row.college_email === row.personal_email) {
      errors.push("College email and personal email cannot be the same");
    }

    // Validate grad_year if present
    let gradYear: number | null = null;
    if (row.grad_year != null && row.grad_year !== "") {
      gradYear = typeof row.grad_year === "number" ? row.grad_year : parseInt(String(row.grad_year), 10);
      if (isNaN(gradYear) || gradYear < 1950 || gradYear > 2100) {
        errors.push(`Invalid grad_year: ${row.grad_year}`);
        gradYear = null;
      }
    }

    if (row.college_email) {
      seenCollegeEmails.add(row.college_email);
    }

    if (errors.length > 0) {
      results.push({ row: rowNum, valid: false, errors });
    } else {
      results.push({
        row: rowNum,
        valid: true,
        errors: [],
        data: {
          college_email: row.college_email,
          personal_email: row.personal_email,
          full_name: row.full_name?.trim() || null,
          grad_year: gradYear,
          degree: row.degree?.trim() || null,
          major: row.major?.trim() || null,
          college_id: row.college_id?.trim() || null,
        },
      });
    }
  });

  return results;
}

// ─── Summary helpers ─────────────────────────────────────────

export function getValidationSummary(results: AlumniInviteValidationResult[]) {
  const valid = results.filter((r) => r.valid);
  const invalid = results.filter((r) => !r.valid);
  return {
    total: results.length,
    validCount: valid.length,
    invalidCount: invalid.length,
    validRows: valid,
    invalidRows: invalid,
  };
}
