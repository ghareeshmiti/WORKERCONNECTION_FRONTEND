-- Safe backfill: Assign department_id to legacy workers with NULL department_id
-- This migration is idempotent and safe to re-run

DO $$
DECLARE
    dept_count INTEGER;
    single_dept_id UUID;
    updated_count INTEGER;
BEGIN
    -- Count active departments
    SELECT COUNT(*) INTO dept_count FROM public.departments WHERE is_active = true;
    
    IF dept_count = 1 THEN
        -- Get the single department ID
        SELECT id INTO single_dept_id FROM public.departments WHERE is_active = true LIMIT 1;
        
        -- Update all workers with NULL department_id
        UPDATE public.workers 
        SET department_id = single_dept_id, updated_at = now()
        WHERE department_id IS NULL;
        
        GET DIAGNOSTICS updated_count = ROW_COUNT;
        RAISE NOTICE 'Updated % workers with department_id = %', updated_count, single_dept_id;
        
    ELSIF dept_count > 1 THEN
        -- Multiple departments: Only infer from active worker mappings
        UPDATE public.workers w
        SET department_id = e.department_id, updated_at = now()
        FROM public.worker_mappings wm
        JOIN public.establishments e ON e.id = wm.establishment_id
        WHERE w.department_id IS NULL
          AND wm.worker_id = w.id
          AND wm.is_active = true;
        
        GET DIAGNOSTICS updated_count = ROW_COUNT;
        RAISE NOTICE 'Updated % workers via active mapping inference (multiple depts)', updated_count;
        
        -- Log workers that could not be inferred
        RAISE NOTICE 'Workers with NULL department_id remaining: %', 
            (SELECT COUNT(*) FROM public.workers WHERE department_id IS NULL);
    ELSE
        RAISE NOTICE 'No active departments found. No updates made.';
    END IF;
END $$;