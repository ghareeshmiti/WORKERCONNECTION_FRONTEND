import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EstablishmentRegistrationRequest {
  // Step 1: Establishment Details
  name: string;
  contactPerson?: string;
  email: string;
  phone: string;
  password: string;
  // Step 2: Address Details
  doorNo?: string;
  street?: string;
  district: string;
  mandal?: string;
  village?: string;
  pincode?: string;
  addressLine?: string;
  // Step 3: Business Details
  hasPlanApproval?: string;
  category?: string;
  natureOfWork?: string;
  commencementDate?: string;
  completionDate?: string;
  departmentId: string;
  // Step 4: Construction Details
  estimatedCost?: string;
  constructionArea?: string;
  builtUpArea?: string;
  basicEstimationCost?: string;
  maleWorkers?: string;
  femaleWorkers?: string;
  // Legacy fields for compatibility
  code?: string;
  description?: string;
  establishmentType?: string;
  state?: string;
  licenseNumber?: string;
  constructionType?: string;
  projectName?: string;
  contractorName?: string;
  estimatedWorkers?: number;
  startDate?: string;
  expectedEndDate?: string;
}

// Generate establishment code from name
function generateCode(name: string): string {
  const cleanName = name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const prefix = cleanName.substring(0, 3) || 'EST';
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

    const body: EstablishmentRegistrationRequest = await req.json();
    console.log('Establishment registration request:', { email: body.email, name: body.name });

    // Validate required fields
    if (!body.email || !body.password || !body.name || !body.phone || !body.district || !body.departmentId) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing required fields: name, email, phone, password, district, departmentId' }),
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

    // Generate code if not provided
    const code = body.code || generateCode(body.name);
    // Default state to Andhra Pradesh
    const state = body.state || 'Andhra Pradesh';

    // Calculate total estimated workers
    const maleWorkers = parseInt(body.maleWorkers || '0') || 0;
    const femaleWorkers = parseInt(body.femaleWorkers || '0') || 0;
    const totalWorkers = body.estimatedWorkers || (maleWorkers + femaleWorkers) || null;

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

      // Build full address
      const addressParts = [body.doorNo, body.street, body.village, body.mandal, body.district, body.pincode].filter(Boolean);
      const fullAddress = body.addressLine || addressParts.join(', ');

      // Step 2: Insert establishment record
      const { data: estData, error: estError } = await supabase
        .from('establishments')
        .insert({
          department_id: body.departmentId,
          name: body.name.trim(),
          code: code,
          description: body.description || body.contactPerson || null,
          establishment_type: body.establishmentType || body.category || null,
          state: state,
          district: body.district,
          mandal: body.mandal || null,
          pincode: body.pincode || null,
          address_line: fullAddress || null,
          phone: body.phone,
          email: body.email.toLowerCase(),
          license_number: body.licenseNumber || (body.hasPlanApproval === 'yes' ? 'APPROVED' : null),
          construction_type: body.constructionType || body.natureOfWork || null,
          project_name: body.projectName || body.village || null,
          contractor_name: body.contractorName || body.contactPerson || null,
          estimated_workers: totalWorkers,
          start_date: body.startDate || body.commencementDate || null,
          expected_end_date: body.expectedEndDate || body.completionDate || null,
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
          full_name: body.contactPerson || body.name.trim(),
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
          establishment_code: code,
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
