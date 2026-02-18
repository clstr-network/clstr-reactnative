-- Fix calculate_profile_completion function to handle enum role field correctly
-- The role field is an enum and cannot be compared to an empty string

BEGIN;

CREATE OR REPLACE FUNCTION calculate_profile_completion(profile_record RECORD)
RETURNS INTEGER AS $$
DECLARE
  total_fields INTEGER := 15;
  filled_fields INTEGER := 0;
BEGIN
  -- Count non-null essential fields
  IF profile_record.full_name IS NOT NULL AND profile_record.full_name != '' THEN filled_fields := filled_fields + 1; END IF;
  IF profile_record.email IS NOT NULL AND profile_record.email != '' THEN filled_fields := filled_fields + 1; END IF;
  IF profile_record.avatar_url IS NOT NULL AND profile_record.avatar_url != '' THEN filled_fields := filled_fields + 1; END IF;
  IF profile_record.headline IS NOT NULL AND profile_record.headline != '' THEN filled_fields := filled_fields + 1; END IF;
  IF profile_record.bio IS NOT NULL AND profile_record.bio != '' THEN filled_fields := filled_fields + 1; END IF;
  IF profile_record.location IS NOT NULL AND profile_record.location != '' THEN filled_fields := filled_fields + 1; END IF;
  -- Fixed: role is an enum, so we only check for NOT NULL
  IF profile_record.role IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF profile_record.university IS NOT NULL AND profile_record.university != '' THEN filled_fields := filled_fields + 1; END IF;
  IF profile_record.major IS NOT NULL AND profile_record.major != '' THEN filled_fields := filled_fields + 1; END IF;
  -- Fixed: graduation_year is likely an integer, not a string with empty check
  IF profile_record.graduation_year IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF profile_record.phone IS NOT NULL AND profile_record.phone != '' THEN filled_fields := filled_fields + 1; END IF;
  IF profile_record.cover_photo_url IS NOT NULL AND profile_record.cover_photo_url != '' THEN filled_fields := filled_fields + 1; END IF;
  IF profile_record.interests IS NOT NULL AND array_length(profile_record.interests, 1) > 0 THEN filled_fields := filled_fields + 1; END IF;
  -- Fixed: social_links might be text or jsonb, handle safely
  IF profile_record.social_links IS NOT NULL AND profile_record.social_links::text != '' AND profile_record.social_links::text != '[]' THEN filled_fields := filled_fields + 1; END IF;
  IF profile_record.domain IS NOT NULL AND profile_record.domain != '' THEN filled_fields := filled_fields + 1; END IF;
  
  RETURN (filled_fields * 100) / total_fields;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMIT;
