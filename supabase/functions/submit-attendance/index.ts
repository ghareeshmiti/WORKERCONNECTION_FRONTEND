import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AttendanceSubmissionRequest {
  workerIdentifier: string; // Can be worker_id or employee_id
  establishmentId: string; // Required: the establishment making the request
}

// Error codes for client handling
const ErrorCodes = {
  INVALID_INPUT: 'INVALID_INPUT',
  ESTABLISHMENT_NOT_FOUND: 'ESTABLISHMENT_NOT_FOUND',
  ESTABLISHMENT_NOT_APPROVED: 'ESTABLISHMENT_NOT_APPROVED',
  WORKER_NOT_FOUND: 'WORKER_NOT_FOUND',
  WORKER_INACTIVE: 'WORKER_INACTIVE',
  WORKER_DEPT_MISMATCH: 'WORKER_DEPT_MISMATCH',
  NO_ACTIVE_MAPPING: 'NO_ACTIVE_MAPPING',
  MAPPED_TO_DIFFERENT_ESTABLISHMENT: 'MAPPED_TO_DIFFERENT_ESTABLISHMENT',
  LOOKUP_ERROR: 'LOOKUP_ERROR',
  INSERT_ERROR: 'INSERT_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const body: AttendanceSubmissionRequest = await req.json();
    console.log('Attendance submission request:', { 
      workerIdentifier: body.workerIdentifier,
      establishmentId: body.establishmentId 
    });

    // ============================================
    // VALIDATION 1: Required fields
    // ============================================
    if (!body.workerIdentifier || !body.workerIdentifier.trim()) {
      console.log('Validation failed: Missing worker identifier');
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Worker ID or Employee ID is required',
          code: ErrorCodes.INVALID_INPUT
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!body.establishmentId || !body.establishmentId.trim()) {
      console.log('Validation failed: Missing establishment ID');
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Establishment ID is required',
          code: ErrorCodes.INVALID_INPUT
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const identifier = body.workerIdentifier.trim().toUpperCase();
    const establishmentId = body.establishmentId.trim();

    // ============================================
    // VALIDATION 2: Establishment exists and is APPROVED
    // ============================================
    const { data: establishmentData, error: estError } = await supabase
      .from('establishments')
      .select('id, name, state, department_id, is_approved, is_active')
      .eq('id', establishmentId)
      .maybeSingle();

    if (estError) {
      console.error('Establishment lookup failed:', estError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Error looking up establishment',
          code: ErrorCodes.LOOKUP_ERROR
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!establishmentData) {
      console.log('Validation failed: Establishment not found', establishmentId);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Establishment not found',
          code: ErrorCodes.ESTABLISHMENT_NOT_FOUND
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!establishmentData.is_approved) {
      console.log('Validation failed: Establishment not approved', establishmentId);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'This establishment is pending department approval. Attendance cannot be recorded until approved.',
          code: ErrorCodes.ESTABLISHMENT_NOT_APPROVED
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // VALIDATION 3: Worker exists
    // ============================================
    const { data: workerData, error: workerError } = await supabase
      .from('workers')
      .select('id, worker_id, employee_id, first_name, last_name, is_active, department_id')
      .or(`worker_id.eq.${identifier},employee_id.eq.${identifier}`)
      .maybeSingle();

    if (workerError) {
      console.error('Worker lookup failed:', workerError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Error looking up worker',
          code: ErrorCodes.LOOKUP_ERROR
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!workerData) {
      console.log('Validation failed: Worker not found', identifier);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Worker not found with the provided ID. Please verify your Worker ID or Employee ID.',
          code: ErrorCodes.WORKER_NOT_FOUND
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // VALIDATION 4: Worker is ACTIVE
    // ============================================
    if (!workerData.is_active) {
      console.log('Validation failed: Worker not active', workerData.worker_id);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'This worker is not active. Please contact your department administrator.',
          code: ErrorCodes.WORKER_INACTIVE
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // VALIDATION 5: Worker belongs to SAME department as establishment
    // ============================================
    if (workerData.department_id !== establishmentData.department_id) {
      console.log('Validation failed: Department mismatch', {
        workerDept: workerData.department_id,
        estDept: establishmentData.department_id
      });
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'This worker belongs to a different department and cannot check in at this establishment.',
          code: ErrorCodes.WORKER_DEPT_MISMATCH
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // VALIDATION 6: Worker has ACTIVE mapping to THIS establishment
    // ============================================
    const { data: mappingData, error: mappingError } = await supabase
      .from('worker_mappings')
      .select('id, establishment_id')
      .eq('worker_id', workerData.id)
      .eq('is_active', true)
      .maybeSingle();

    if (mappingError) {
      console.error('Mapping lookup failed:', mappingError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Error checking worker mapping',
          code: ErrorCodes.LOOKUP_ERROR
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!mappingData) {
      console.log('Validation failed: No active mapping', workerData.worker_id);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'This worker is not currently mapped to any establishment. Please contact your establishment administrator to be added.',
          code: ErrorCodes.NO_ACTIVE_MAPPING
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (mappingData.establishment_id !== establishmentId) {
      console.log('Validation failed: Mapped to different establishment', {
        mapped: mappingData.establishment_id,
        requested: establishmentId
      });
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'This worker is mapped to a different establishment and cannot check in here.',
          code: ErrorCodes.MAPPED_TO_DIFFERENT_ESTABLISHMENT
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // ALL VALIDATIONS PASSED - Record Attendance
    // ============================================
    console.log('All validations passed. Recording attendance for:', workerData.worker_id);

    const region = establishmentData.state || 'Unknown';
    const establishmentName = establishmentData.name || 'Unknown';

    // Get current time in Asia/Kolkata
    const now = new Date();
    const kolkataTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const todayStart = new Date(kolkataTime);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(kolkataTime);
    todayEnd.setHours(23, 59, 59, 999);

    // Check today's events for this worker
    const { data: todayEvents, error: eventsError } = await supabase
      .from('attendance_events')
      .select('event_type, occurred_at')
      .eq('worker_id', workerData.id)
      .gte('occurred_at', todayStart.toISOString())
      .lte('occurred_at', todayEnd.toISOString())
      .order('occurred_at', { ascending: true });

    if (eventsError) {
      console.error('Events lookup failed:', eventsError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Error checking attendance history',
          code: ErrorCodes.LOOKUP_ERROR
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine event type based on existing events
    const checkIns = todayEvents?.filter(e => e.event_type === 'CHECK_IN') || [];
    const checkOuts = todayEvents?.filter(e => e.event_type === 'CHECK_OUT') || [];
    
    let eventType: 'CHECK_IN' | 'CHECK_OUT';
    
    if (checkIns.length === 0) {
      // No check-in today, this is a check-in
      eventType = 'CHECK_IN';
    } else if (checkOuts.length < checkIns.length) {
      // More check-ins than check-outs, this is a check-out
      eventType = 'CHECK_OUT';
    } else {
      // Equal check-ins and check-outs, this is a new check-in
      eventType = 'CHECK_IN';
    }

    // Insert attendance event with region derived from establishment
    const { data: eventData, error: insertError } = await supabase
      .from('attendance_events')
      .insert({
        worker_id: workerData.id,
        event_type: eventType,
        occurred_at: now.toISOString(),
        region: region,
        establishment_id: establishmentId,
        meta: { timezone: 'Asia/Kolkata' }
      })
      .select('id, event_type, occurred_at')
      .single();

    if (insertError) {
      console.error('Event insertion failed:', insertError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Failed to record attendance',
          code: ErrorCodes.INSERT_ERROR
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Attendance recorded successfully:', {
      eventId: eventData.id,
      eventType: eventData.event_type,
      worker: workerData.worker_id,
      establishment: establishmentName
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `${eventType === 'CHECK_IN' ? 'Check-in' : 'Check-out'} recorded successfully`,
        data: {
          eventId: eventData.id,
          eventType: eventData.event_type,
          occurredAt: eventData.occurred_at,
          workerName: `${workerData.first_name} ${workerData.last_name}`,
          workerId: workerData.worker_id,
          establishmentName,
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Internal server error. Please try again.',
        code: ErrorCodes.INTERNAL_ERROR
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
