-- Fix update_attendance_rollup to use establishment_id from the event itself
-- instead of querying current active mapping (preserves historical accuracy)
CREATE OR REPLACE FUNCTION public.update_attendance_rollup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    event_date DATE;
    first_in TIMESTAMPTZ;
    last_out TIMESTAMPTZ;
    calc_status attendance_status;
    mapped_establishment_id UUID;
BEGIN
    -- Get date in Asia/Kolkata timezone
    event_date := (NEW.occurred_at AT TIME ZONE 'Asia/Kolkata')::DATE;
    
    -- Get first check-in
    SELECT MIN(occurred_at) INTO first_in
    FROM public.attendance_events
    WHERE worker_id = NEW.worker_id
    AND (occurred_at AT TIME ZONE 'Asia/Kolkata')::DATE = event_date
    AND event_type = 'CHECK_IN';
    
    -- Get last check-out
    SELECT MAX(occurred_at) INTO last_out
    FROM public.attendance_events
    WHERE worker_id = NEW.worker_id
    AND (occurred_at AT TIME ZONE 'Asia/Kolkata')::DATE = event_date
    AND event_type = 'CHECK_OUT';
    
    -- Calculate status
    IF first_in IS NOT NULL AND last_out IS NOT NULL THEN
        calc_status := 'PRESENT';
    ELSIF first_in IS NOT NULL OR last_out IS NOT NULL THEN
        calc_status := 'PARTIAL';
    ELSE
        calc_status := 'ABSENT';
    END IF;
    
    -- USE establishment_id from the attendance event itself (NOT current mapping)
    -- This preserves historical accuracy when workers are remapped
    mapped_establishment_id := NEW.establishment_id;
    
    -- Upsert rollup
    INSERT INTO public.attendance_daily_rollups (
        worker_id, 
        attendance_date, 
        first_checkin_at, 
        last_checkout_at, 
        status,
        establishment_id,
        total_hours
    )
    VALUES (
        NEW.worker_id, 
        event_date, 
        first_in, 
        last_out, 
        calc_status,
        mapped_establishment_id,
        CASE WHEN first_in IS NOT NULL AND last_out IS NOT NULL 
             THEN EXTRACT(EPOCH FROM (last_out - first_in)) / 3600 
             ELSE NULL 
        END
    )
    ON CONFLICT (worker_id, attendance_date) 
    DO UPDATE SET
        first_checkin_at = EXCLUDED.first_checkin_at,
        last_checkout_at = EXCLUDED.last_checkout_at,
        status = EXCLUDED.status,
        establishment_id = EXCLUDED.establishment_id,
        total_hours = EXCLUDED.total_hours,
        updated_at = now();
    
    RETURN NEW;
END;
$function$;