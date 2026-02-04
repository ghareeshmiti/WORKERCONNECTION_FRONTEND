import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DepartmentRegistrationRequest {
  // Step 1: Details
  name: string;
  email: string;
  phone: string;
  password: string;
  // Step 2: Address
  district: string;
  mandal?: string;
  pincode?: string;
  addressLine?: string;
  // Auto-generated
  code?: string;
  state?: string;
  description?: string;
}

// Generate department code from name
function generateCode(name: string): string {
  const cleanName = name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const prefix = cleanName.substring(0, 4) || 'DEPT';
  const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
  return `${prefix}-${timestamp}`;
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

    const body: DepartmentRegistrationRequest = await req.json();
    console.log('Department registration request:', { email: body.email, name: body.name });

    // Validate required fields
    if (!body.email || !body.password || !body.name || !body.phone || !body.district) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing required fields: name, email, phone, password, district' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate phone number (10 digits)
    if (!/^\d{10}$/.test(body.phone)) {
      return new Response(
        JSON.stringify({ success: false, message: 'Phone number must be exactly 10 digits' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate code if not provided
    const code = body.code || generateCode(body.name);
    // Default state to Andhra Pradesh (all districts in JSON are from AP)
    const state = body.state || 'Andhra Pradesh';

    let authUserId: string | null = null;
    let departmentId: string | null = null;
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
        if (authError.message.includes('already been registered')) {
          return new Response(
            JSON.stringify({ success: false, message: 'This email is already registered. Please login.' }),
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

      // Step 2: Insert department record
      const { data: deptData, error: deptError } = await supabase
        .from('departments')
        .insert({
          name: body.name.trim(),
          code: code,
          description: body.description || null,
          state: state,
          district: body.district,
          mandal: body.mandal || null,
          pincode: body.pincode || null,
          address_line: body.addressLine || null,
          phone: body.phone,
          email: body.email.toLowerCase(),
          is_active: true,
        })
        .select('id')
        .single();

      if (deptError) {
        throw new Error(`Department creation failed: ${deptError.message}`);
      }

      departmentId = deptData.id;
      console.log('Department created:', departmentId);

      // Step 3: Insert profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .insert({
          auth_user_id: authUserId,
          full_name: body.name.trim(),
          department_id: departmentId,
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
          role: 'DEPARTMENT_ADMIN',
        });

      if (roleError) {
        throw new Error(`Role assignment failed: ${roleError.message}`);
      }

      console.log('Department registration completed successfully');

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Department registered successfully',
          department_code: code,
          profile_context: {
            auth_user_id: authUserId,
            role: 'DEPARTMENT_ADMIN',
            department_id: departmentId,
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      console.error('Registration error, rolling back:', error);
      
      if (profileId) {
        await supabase.from('profiles').delete().eq('id', profileId);
      }
      
      if (departmentId) {
        await supabase.from('departments').delete().eq('id', departmentId);
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
