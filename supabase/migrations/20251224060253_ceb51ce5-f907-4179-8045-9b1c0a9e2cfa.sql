-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Workers can view mapped establishment" ON public.establishments;

-- Create a security definer function to get worker's mapped establishment IDs
-- This avoids recursion by bypassing RLS
CREATE OR REPLACE FUNCTION public.get_worker_mapped_establishment_ids(_worker_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT establishment_id
  FROM public.worker_mappings
  WHERE worker_id = _worker_id
  AND is_active = true
$$;

-- Create the new policy using the security definer function
CREATE POLICY "Workers can view mapped establishment"
ON public.establishments
FOR SELECT
USING (
  has_role(auth.uid(), 'WORKER'::app_role) 
  AND id IN (SELECT get_worker_mapped_establishment_ids(get_user_worker_id(auth.uid())))
);