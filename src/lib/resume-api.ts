import { supabase } from "@/integrations/supabase/client";
import { assertValidUuid } from "@/lib/uuid";

const RESUME_BUCKET = "resumes";
const MAX_RESUME_BYTES = 10 * 1024 * 1024; // 10MB limit to keep uploads lightweight
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

export const getSignedResumeUrl = async (storagePath: string, fileName?: string) => {
  const { data, error } = await supabase.storage
    .from(RESUME_BUCKET)
    .createSignedUrl(storagePath, 60, { download: fileName || "resume.pdf" });

  if (error || !data?.signedUrl) {
    throw error || new Error("Unable to generate resume download link");
  }

  return data.signedUrl;
};

export const resolveResumeDownloadUrl = async (profileId: string) => {
  assertValidUuid(profileId, "profileId");

  const { data, error } = await supabase
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

  return getSignedResumeUrl(data.resume_storage_path, data.resume_filename || "resume.pdf");
};

export const uploadResumeForProfile = async (
  profileId: string,
  file: File
): Promise<ResumeMetadata & { signedUrl: string }> => {
  assertValidUuid(profileId, "profileId");

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Resume must be a PDF file");
  }

  if (file.size > MAX_RESUME_BYTES) {
    throw new Error("Resume file is too large (max 10MB)");
  }

  const safeFileName = sanitizeFileName(file.name);
  const storagePath = `${profileId}/${Date.now()}-${safeFileName}`;

  const { error: uploadError } = await supabase.storage
    .from(RESUME_BUCKET)
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type || "application/pdf",
    });

  if (uploadError) throw uploadError;

  const timestamp = new Date().toISOString();
  const { data, error } = await supabase
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

  const signedUrl = await getSignedResumeUrl(storagePath, safeFileName);

  return {
    ...data,
    signedUrl,
  };
};
