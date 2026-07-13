-- =============================================================================
-- Fix: working hours could not be saved because agenda_settings.user_id
-- lacked a unique constraint, so the .upsert({ onConflict: "user_id" })
-- from the app failed.
-- -----------------------------------------------------------------------------
-- 1. Deduplicate existing agenda_settings rows (keep the most recently created).
-- 2. Add a unique constraint on user_id so upsert works.
-- 3. Add a unique index covering user_id for fast lookups.
-- =============================================================================

-- Remove duplicate rows, keeping the one with the latest created_at per user.
DELETE FROM public.agenda_settings a
USING public.agenda_settings b
WHERE a.id < b.id
  AND a.user_id = b.user_id;

-- Ensure the unique constraint exists.
ALTER TABLE public.agenda_settings
  ADD CONSTRAINT agenda_settings_user_id_unique UNIQUE (user_id);

-- Ensure a supporting unique index exists (idempotent).
CREATE UNIQUE INDEX IF NOT EXISTS idx_agenda_settings_user_id
  ON public.agenda_settings(user_id);
