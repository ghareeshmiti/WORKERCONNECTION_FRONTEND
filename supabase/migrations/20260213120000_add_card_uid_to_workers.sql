-- Add card_uid column to workers table for NFC smart card login
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS card_uid TEXT UNIQUE;

-- Index for fast lookup by card UID
CREATE INDEX IF NOT EXISTS idx_workers_card_uid ON public.workers(card_uid);