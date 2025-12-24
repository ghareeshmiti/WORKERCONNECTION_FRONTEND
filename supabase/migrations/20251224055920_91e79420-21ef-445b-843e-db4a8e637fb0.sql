-- Allow workers to view establishments they are mapped to
CREATE POLICY "Workers can view mapped establishment"
ON public.establishments
FOR SELECT
USING (
  has_role(auth.uid(), 'WORKER'::app_role) 
  AND EXISTS (
    SELECT 1 FROM public.worker_mappings wm
    WHERE wm.establishment_id = establishments.id
    AND wm.worker_id = get_user_worker_id(auth.uid())
    AND wm.is_active = true
  )
);