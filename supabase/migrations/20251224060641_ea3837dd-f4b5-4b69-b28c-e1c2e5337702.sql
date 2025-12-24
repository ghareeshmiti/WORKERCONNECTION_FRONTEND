-- Drop the problematic unique constraint that prevents multiple inactive mappings
-- This constraint incorrectly only allows one row per (worker_id, is_active) combination
-- We should only have the partial index that ensures one ACTIVE mapping per worker
ALTER TABLE public.worker_mappings DROP CONSTRAINT IF EXISTS unique_active_worker_mapping;