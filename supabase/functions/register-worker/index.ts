import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WorkerRegistrationRequest {
  // Identity
  aadhaarLastFour: string;
  eshramId?: string;
  bocwId?: string;
  // Personal
  firstName: string;
  middleName?: string;
  lastName: string;
  gender: string;
  maritalStatus?: string;
  dateOfBirth: string;
  fatherHusbandName?: string;
  caste?: string;
  subCaste?: string;
  phone: string;
  password: string;
  // Address
  state: string;
  district: string;
  mandal?: string;
  village?: string;
  pincode?: string;
  addressLine?: string;
  // Other
  nresMember?: string;
  tradeUnionMember?: string;
  // Legacy fields for compatibility
  email?: string;
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
    console.log('Worker registration request:', { phone: body.phone, firstName: body.firstName });

    // Validate required fields
    if (!body.phone || !body.password || !body.firstName || !body.lastName || !body.state || !body.district) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing required fields: phone, password, firstName, lastName, state, district' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate phone number format (10 digits starting with 6-9)
    if (!/^[6-9]\d{9}$/.test(body.phone)) {
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid phone number format. Must be 10 digits starting with 6-9.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate email from phone for auth (workers login via mobile)
    const generatedEmail = `${body.phone}@worker.local`;

    let authUserId: string | null = null;
    let workerId: string | null = null;
    let workerUUID: string | null = null;
    let profileId: string | null = null;

    try {
      // Step 1: Create auth user with generated email
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: generatedEmail,
        password: body.password,
        email_confirm: true,
      });

      if (authError) {
        console.error('Auth user creation failed:', authError);
        // Check for duplicate phone
        if (authError.message.includes('already been registered')) {
          return new Response(
            JSON.stringify({ success: false, message: 'This mobile number is already registered. Please login.' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
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
      
      workerId = `WKR${String((workerCount ?? 0) + 1).padStart(8, '0')}`;
      console.log('Generated worker ID:', workerId);

      // Step 3: Insert worker record
      const { data: workerData, error: workerError } = await supabase
        .from('workers')
        .insert({
          worker_id: workerId,
          first_name: body.firstName.trim(),
          last_name: body.lastName.trim(),
          email: body.email || null,
          date_of_birth: body.dateOfBirth || null,
          gender: body.gender || null,
          phone: body.phone,
          aadhaar_last_four: body.aadhaarLastFour || null,
          state: body.state,
          district: body.district,
          mandal: body.mandal || null,
          pincode: body.pincode || null,
          address_line: body.addressLine || null,
          emergency_contact_name: body.emergencyContactName || body.fatherHusbandName || null,
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

      workerUUID = workerData.id;
      console.log('Worker created:', workerUUID);

      // Step 4: Insert profile
      const fullName = body.middleName 
        ? `${body.firstName} ${body.middleName} ${body.lastName}`
        : `${body.firstName} ${body.lastName}`;

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .insert({
          auth_user_id: authUserId,
          full_name: fullName.trim(),
          worker_id: workerUUID,
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
          worker_id: workerId,
          profile_context: {
            auth_user_id: authUserId,
            role: 'WORKER',
            worker_id: workerUUID,
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
      if (workerUUID) {
        await supabase.from('workers').delete().eq('id', workerUUID);
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
