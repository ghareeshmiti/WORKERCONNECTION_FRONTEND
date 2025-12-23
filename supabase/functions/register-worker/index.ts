import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WorkerRegistrationRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  dateOfBirth?: string;
  gender?: string;
  phone?: string;
  aadhaarLastFour?: string;
  state: string;
  district: string;
  mandal?: string;
  pincode?: string;
  addressLine?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  skills?: string[];
  experienceYears?: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const body: WorkerRegistrationRequest = await req.json();
    console.log('Worker registration request:', { email: body.email, firstName: body.firstName });

    // Validate required fields
    if (!body.email || !body.password || !body.firstName || !body.lastName || !body.state || !body.district) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let authUserId: string | null = null;
    let workerId: string | null = null;
    let profileId: string | null = null;

    try {
      // Step 1: Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: body.email,
        password: body.password,
        email_confirm: true,
      });

      if (authError) {
        console.error('Auth user creation failed:', authError);
        return new Response(
          JSON.stringify({ success: false, message: authError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      authUserId = authData.user.id;
      console.log('Auth user created:', authUserId);

      // Step 2: Generate worker ID
      const { count: workerCount } = await supabase
        .from('workers')
        .select('*', { count: 'exact', head: true });
      
      const workerIdStr = `WKR${String((workerCount ?? 0) + 1).padStart(8, '0')}`;

      // Step 3: Insert worker record
      const { data: workerData, error: workerError } = await supabase
        .from('workers')
        .insert({
          worker_id: workerIdStr,
          first_name: body.firstName,
          last_name: body.lastName,
          email: body.email,
          date_of_birth: body.dateOfBirth || null,
          gender: body.gender || null,
          phone: body.phone || null,
          aadhaar_last_four: body.aadhaarLastFour || null,
          state: body.state,
          district: body.district,
          mandal: body.mandal || null,
          pincode: body.pincode || null,
          address_line: body.addressLine || null,
          emergency_contact_name: body.emergencyContactName || null,
          emergency_contact_phone: body.emergencyContactPhone || null,
          skills: body.skills || [],
          experience_years: body.experienceYears || null,
          is_active: true,
        })
        .select('id')
        .single();

      if (workerError) {
        throw new Error(`Worker creation failed: ${workerError.message}`);
      }

      workerId = workerData.id;
      console.log('Worker created:', workerId);

      // Step 4: Insert profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .insert({
          auth_user_id: authUserId,
          full_name: `${body.firstName} ${body.lastName}`,
          worker_id: workerId,
        })
        .select('id')
        .single();

      if (profileError) {
        throw new Error(`Profile creation failed: ${profileError.message}`);
      }

      profileId = profileData.id;
      console.log('Profile created:', profileId);

      // Step 5: Insert user role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authUserId,
          role: 'WORKER',
        });

      if (roleError) {
        throw new Error(`Role assignment failed: ${roleError.message}`);
      }

      console.log('Worker registration completed successfully');

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Worker registered successfully',
          profile_context: {
            auth_user_id: authUserId,
            role: 'WORKER',
            worker_id: workerId,
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      console.error('Registration error, rolling back:', error);
      
      // Rollback: Delete profile if created
      if (profileId) {
        await supabase.from('profiles').delete().eq('id', profileId);
      }
      
      // Rollback: Delete worker if created
      if (workerId) {
        await supabase.from('workers').delete().eq('id', workerId);
      }
      
      // Rollback: Delete auth user if created
      if (authUserId) {
        await supabase.auth.admin.deleteUser(authUserId);
      }

      return new Response(
        JSON.stringify({ success: false, message: error instanceof Error ? error.message : 'Unknown error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
