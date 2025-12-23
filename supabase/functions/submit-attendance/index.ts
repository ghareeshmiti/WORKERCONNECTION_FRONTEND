import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AttendanceSubmissionRequest {
  workerId: string; // Can be worker_id or employee_id
  region: string;
}

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
    console.log('Attendance submission request:', body);

    // Validate required fields
    if (!body.workerId || !body.region) {
      return new Response(
        JSON.stringify({ success: false, message: 'Worker ID and region are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find worker by worker_id or employee_id
    const { data: workerData, error: workerError } = await supabase
      .from('workers')
      .select('id, worker_id, employee_id, first_name, last_name, is_active')
      .or(`worker_id.eq.${body.workerId},employee_id.eq.${body.workerId}`)
      .maybeSingle();

    if (workerError) {
      console.error('Worker lookup failed:', workerError);
      return new Response(
        JSON.stringify({ success: false, message: 'Error looking up worker' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!workerData) {
      return new Response(
        JSON.stringify({ success: false, message: 'Worker not found with the provided ID' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!workerData.is_active) {
      return new Response(
        JSON.stringify({ success: false, message: 'Worker is not active' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
        JSON.stringify({ success: false, message: 'Error checking attendance' }),
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

    // Get worker's current establishment mapping - REQUIRED for attendance
    const { data: mappingData, error: mappingError } = await supabase
      .from('worker_mappings')
      .select('establishment_id, establishments(name)')
      .eq('worker_id', workerData.id)
      .eq('is_active', true)
      .maybeSingle();

    if (mappingError) {
      console.error('Mapping lookup failed:', mappingError);
      return new Response(
        JSON.stringify({ success: false, message: 'Error checking worker mapping' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!mappingData) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Worker is not mapped to any establishment. Please contact your establishment administrator to be added.',
          code: 'NO_ACTIVE_MAPPING'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert attendance event
    const { data: eventData, error: insertError } = await supabase
      .from('attendance_events')
      .insert({
        worker_id: workerData.id,
        event_type: eventType,
        occurred_at: now.toISOString(),
        region: body.region,
        establishment_id: mappingData.establishment_id,
        meta: { timezone: 'Asia/Kolkata' }
      })
      .select('id, event_type, occurred_at')
      .single();

    if (insertError) {
      console.error('Event insertion failed:', insertError);
      return new Response(
        JSON.stringify({ success: false, message: 'Failed to record attendance' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const establishmentName = (mappingData.establishments as any)?.name || 'Unknown';
    console.log('Attendance recorded successfully:', eventData);

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
      JSON.stringify({ success: false, message: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
