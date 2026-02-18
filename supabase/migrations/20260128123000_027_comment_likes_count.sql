BEGIN;

-- Update comment likes_count on like/unlike
CREATE OR REPLACE FUNCTION public.update_comment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.comments SET likes_count = likes_count + 1 WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.comments SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.comment_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_comment_likes_count ON public.comment_likes;
CREATE TRIGGER update_comment_likes_count
AFTER INSERT OR DELETE ON public.comment_likes
FOR EACH ROW EXECUTE PROCEDURE public.update_comment_likes_count();

-- Backfill existing comment like counts
UPDATE public.comments c
SET likes_count = COALESCE(cl.like_count, 0)
FROM (
  SELECT comment_id, COUNT(*)::int AS like_count
  FROM public.comment_likes
  GROUP BY comment_id
) cl
WHERE c.id = cl.comment_id;

UPDATE public.comments
SET likes_count = 0
WHERE id NOT IN (SELECT DISTINCT comment_id FROM public.comment_likes);

COMMIT;
