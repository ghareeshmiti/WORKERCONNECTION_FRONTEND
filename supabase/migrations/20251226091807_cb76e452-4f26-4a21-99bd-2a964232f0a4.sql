-- TASK 1: Enforce department isolation at DB level for worker mappings
-- Create a security definer function to check if worker belongs to same department as establishment

CREATE OR REPLACE FUNCTION public.worker_belongs_to_establishment_department(
  _worker_id uuid,
  _establishment_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workers w
    JOIN public.establishments e ON e.id = _establishment_id
    WHERE w.id = _worker_id
      AND w.department_id = e.department_id
      AND w.is_active = true
  )
$$;

-- Drop the existing INSERT policy if it exists
DROP POLICY IF EXISTS "Establishment admins can create mappings for approved establish" ON public.worker_mappings;

-- Create new INSERT policy that enforces department isolation
CREATE POLICY "Establishment admins can create mappings for approved establish"
ON public.worker_mappings
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'ESTABLISHMENT_ADMIN'::app_role) 
  AND establishment_id = get_user_establishment_id(auth.uid())
  AND EXISTS (
    SELECT 1 FROM establishments e 
    WHERE e.id = worker_mappings.establishment_id 
    AND e.is_approved = true
  )
  AND worker_belongs_to_establishment_department(worker_id, establishment_id)
);