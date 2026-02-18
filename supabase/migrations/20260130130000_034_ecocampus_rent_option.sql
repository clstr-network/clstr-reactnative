-- ============================================================================
-- 034_ecocampus_rent_option.sql
-- Add rent option support for shared items
-- ============================================================================

BEGIN;

ALTER TABLE public.shared_items
  ADD COLUMN IF NOT EXISTS share_type text DEFAULT 'sell' CHECK (share_type IN ('donate', 'sell', 'rent')),
  ADD COLUMN IF NOT EXISTS rent_unit text CHECK (rent_unit IN ('day', 'week', 'month'));

CREATE INDEX IF NOT EXISTS shared_items_share_type_idx ON public.shared_items(share_type);

UPDATE public.shared_items
SET share_type = CASE
  WHEN price IS NULL OR price = '' OR price = 'Free' THEN 'donate'
  ELSE 'sell'
END
WHERE share_type IS NULL;

ALTER TABLE public.shared_item_intents
  DROP CONSTRAINT IF EXISTS shared_item_intents_intent_type_check;

ALTER TABLE public.shared_item_intents
  ADD CONSTRAINT shared_item_intents_intent_type_check
  CHECK (intent_type IN ('contact', 'buy', 'rent'));

COMMIT;
