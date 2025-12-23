import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EstablishmentRegistrationRequest {
  name: string;
  code: string;
  description?: string;
  establishmentType?: string;
  email: string;
  password: string;
  phone?: string;
  state: string;
  district: string;
  mandal?: string;
  pincode?: string;
  addressLine?: string;
  licenseNumber?: string;
  departmentId: string;
  constructionType?: string;
  projectName?: string;
  contractorName?: string;
  estimatedWorkers?: number;
  startDate?: string;
  expectedEndDate?: string;
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

    const body: EstablishmentRegistrationRequest = await req.json();
    console.log('Establishment registration request:', { email: body.email, name: body.name });

    // Validate required fields
    if (!body.email || !body.password || !body.name || !body.code || !body.state || !body.district || !body.departmentId) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify department exists
    const { data: deptData, error: deptError } = await supabase
      .from('departments')
      .select('id')
      .eq('id', body.departmentId)
      .maybeSingle();

    if (deptError || !deptData) {
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid department ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let authUserId: string | null = null;
    let establishmentId: string | null = null;
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

      // Step 2: Insert establishment record
      const { data: estData, error: estError } = await supabase
        .from('establishments')
        .insert({
          department_id: body.departmentId,
          name: body.name,
          code: body.code,
          description: body.description || null,
          establishment_type: body.establishmentType || null,
          state: body.state,
          district: body.district,
          mandal: body.mandal || null,
          pincode: body.pincode || null,
          address_line: body.addressLine || null,
          phone: body.phone || null,
          email: body.email,
          license_number: body.licenseNumber || null,
          construction_type: body.constructionType || null,
          project_name: body.projectName || null,
          contractor_name: body.contractorName || null,
          estimated_workers: body.estimatedWorkers || null,
          start_date: body.startDate || null,
          expected_end_date: body.expectedEndDate || null,
          is_active: true,
        })
        .select('id')
        .single();

      if (estError) {
        throw new Error(`Establishment creation failed: ${estError.message}`);
      }

      establishmentId = estData.id;
      console.log('Establishment created:', establishmentId);

      // Step 3: Insert profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .insert({
          auth_user_id: authUserId,
          full_name: body.name,
          establishment_id: establishmentId,
        })
        .select('id')
        .single();

      if (profileError) {
        throw new Error(`Profile creation failed: ${profileError.message}`);
      }

      profileId = profileData.id;
      console.log('Profile created:', profileId);

      // Step 4: Insert user role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authUserId,
          role: 'ESTABLISHMENT_ADMIN',
        });

      if (roleError) {
        throw new Error(`Role assignment failed: ${roleError.message}`);
      }

      console.log('Establishment registration completed successfully');

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Establishment registered successfully',
          profile_context: {
            auth_user_id: authUserId,
            role: 'ESTABLISHMENT_ADMIN',
            establishment_id: establishmentId,
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      console.error('Registration error, rolling back:', error);
      
      if (profileId) {
        await supabase.from('profiles').delete().eq('id', profileId);
      }
      
      if (establishmentId) {
        await supabase.from('establishments').delete().eq('id', establishmentId);
      }
      
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
