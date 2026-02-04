-- Add department_id to workers table for department isolation
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id);

-- Add access_card_id to workers table
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS access_card_id text;

-- Add is_approved and card_reader_id to establishments table
ALTER TABLE public.establishments ADD COLUMN IF NOT EXISTS is_approved boolean NOT NULL DEFAULT false;
ALTER TABLE public.establishments ADD COLUMN IF NOT EXISTS card_reader_id text;
ALTER TABLE public.establishments ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone;
ALTER TABLE public.establishments ADD COLUMN IF NOT EXISTS approved_by uuid;

-- Create index for department_id on workers
CREATE INDEX IF NOT EXISTS idx_workers_department_id ON public.workers(department_id);

-- Create index for access_card_id on workers
CREATE INDEX IF NOT EXISTS idx_workers_access_card_id ON public.workers(access_card_id);

-- Update RLS policy for workers: Department admins can view workers enrolled under their department
DROP POLICY IF EXISTS "Department admins can view department workers" ON public.workers;
CREATE POLICY "Department admins can view department workers" 
ON public.workers 
FOR SELECT 
USING (
  has_role(auth.uid(), 'DEPARTMENT_ADMIN') 
  AND department_id = get_user_department_id(auth.uid())
);

-- Department admins can insert workers (enroll) under their department
DROP POLICY IF EXISTS "Department admins can insert workers" ON public.workers;
CREATE POLICY "Department admins can insert workers"
ON public.workers
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'DEPARTMENT_ADMIN')
  AND department_id = get_user_department_id(auth.uid())
);

-- Update establishment visibility for workers: only see workers from same department
DROP POLICY IF EXISTS "Establishment admins can view unmapped workers" ON public.workers;
CREATE POLICY "Establishment admins can view unmapped workers from same department"
ON public.workers
FOR SELECT
USING (
  has_role(auth.uid(), 'ESTABLISHMENT_ADMIN')
  AND department_id = (
    SELECT e.department_id 
    FROM establishments e 
    WHERE e.id = get_user_establishment_id(auth.uid())
  )
  AND NOT EXISTS (
    SELECT 1 FROM worker_mappings wm 
    WHERE wm.worker_id = workers.id AND wm.is_active = true
  )
);

-- Update policy for mapped workers: establishment admins see only workers from same department
DROP POLICY IF EXISTS "Establishment admins can view mapped workers" ON public.workers;
CREATE POLICY "Establishment admins can view mapped workers"
ON public.workers
FOR SELECT
USING (
  has_role(auth.uid(), 'ESTABLISHMENT_ADMIN')
  AND department_id = (
    SELECT e.department_id 
    FROM establishments e 
    WHERE e.id = get_user_establishment_id(auth.uid())
  )
  AND EXISTS (
    SELECT 1 FROM worker_mappings wm 
    WHERE wm.worker_id = workers.id 
    AND wm.establishment_id = get_user_establishment_id(auth.uid()) 
    AND wm.is_active = true
  )
);

-- Department admins can update establishments (for approval)
DROP POLICY IF EXISTS "Department admins can update department establishments" ON public.establishments;
CREATE POLICY "Department admins can update department establishments"
ON public.establishments
FOR UPDATE
USING (
  has_role(auth.uid(), 'DEPARTMENT_ADMIN')
  AND department_id = get_user_department_id(auth.uid())
);

-- Update worker_mappings policy: only allow mapping if establishment is approved
DROP POLICY IF EXISTS "Establishment admins can create mappings" ON public.worker_mappings;
CREATE POLICY "Establishment admins can create mappings for approved establishments"
ON public.worker_mappings
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'ESTABLISHMENT_ADMIN')
  AND establishment_id = get_user_establishment_id(auth.uid())
  AND EXISTS (
    SELECT 1 FROM establishments e 
    WHERE e.id = establishment_id AND e.is_approved = true
  )
);