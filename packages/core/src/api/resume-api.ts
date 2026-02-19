import type { SupabaseClient } from '@supabase/supabase-js';
import { assertValidUuid } from '../utils/uuid';
import type { CrossPlatformFile } from '../types/file';
import { getFileName, getFileSize } from '../types/file';

export type { CrossPlatformFile } from '../types/file';

const RESUME_BUCKET = "resumes";
const MAX_RESUME_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["application/pdf"];

type ResumeMetadata = {
  resume_storage_path: string | null;
  resume_filename: string | null;
  resume_url: string | null;
  resume_updated_at: string | null;
};

const sanitizeFileName = (name: string) => {
  const fallback = "resume.pdf";
  if (!name) return fallback;
  const cleaned = name.replace(/[^a-zA-Z0-9_.-]/g, "_");
  return cleaned || fallback;
};

export const getSignedResumeUrl = async (
  client: SupabaseClient,
  storagePath: string,
  fileName?: string,
) => {
  const { data, error } = await client.storage
    .from(RESUME_BUCKET)
    .createSignedUrl(storagePath, 60, { download: fileName || "resume.pdf" });

  if (error || !data?.signedUrl) {
    throw error || new Error("Unable to generate resume download link");
  }

  return data.signedUrl;
};

export const resolveResumeDownloadUrl = async (
  client: SupabaseClient,
  profileId: string,
) => {
  assertValidUuid(profileId, "profileId");

  const { data, error } = await client
    .from("profiles")
    .select("resume_storage_path, resume_filename, resume_url")
    .eq("id", profileId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Profile not found");

  if (data.resume_url) {
    return data.resume_url;
  }

  if (!data.resume_storage_path) {
    throw new Error("No resume uploaded yet");
  }

  return getSignedResumeUrl(client, data.resume_storage_path, data.resume_filename || "resume.pdf");
};

/**
 * Upload a resume for a profile.
 *
 * On web, pass a File (extends Blob) with .name and .type.
 * On mobile, pass { uri, type, name }.
 *
 * Validation of MIME type and size uses the metadata properties;
 * the caller on each platform should ensure the object is suitable
 * for Supabase Storage upload.
 */
export const uploadResumeForProfile = async (
  client: SupabaseClient,
  profileId: string,
  file: CrossPlatformFile,
): Promise<ResumeMetadata & { signedUrl: string }> => {
  assertValidUuid(profileId, "profileId");

  // Extract metadata depending on platform shape
  const fileType = file instanceof Blob
    ? (file as any).type || "application/pdf"
    : file.type;
  const fileName = file instanceof Blob
    ? (file as any).name || "resume.pdf"
    : file.name;
  const fileSize = file instanceof Blob ? file.size : undefined;

  if (!ALLOWED_TYPES.includes(fileType)) {
    throw new Error("Resume must be a PDF file");
  }

  if (fileSize !== undefined && fileSize > MAX_RESUME_BYTES) {
    throw new Error("Resume file is too large (max 10MB)");
  }

  const safeFileName = sanitizeFileName(fileName);
  const storagePath = `${profileId}/${Date.now()}-${safeFileName}`;

  const { error: uploadError } = await client.storage
    .from(RESUME_BUCKET)
    .upload(storagePath, file as any, {
      cacheControl: "3600",
      upsert: true,
      contentType: fileType || "application/pdf",
    });

  if (uploadError) throw uploadError;

  const timestamp = new Date().toISOString();
  const { data, error } = await client
    .from("profiles")
    .update({
      resume_storage_path: storagePath,
      resume_filename: safeFileName,
      resume_updated_at: timestamp,
      resume_url: null,
    })
    .eq("id", profileId)
    .select("resume_storage_path, resume_filename, resume_updated_at, resume_url")
    .maybeSingle();

  if (error || !data) {
    throw error || new Error("Failed to persist resume metadata");
  }

  const signedUrl = await getSignedResumeUrl(client, storagePath, safeFileName);

  return {
    ...data,
    signedUrl,
  };
};
