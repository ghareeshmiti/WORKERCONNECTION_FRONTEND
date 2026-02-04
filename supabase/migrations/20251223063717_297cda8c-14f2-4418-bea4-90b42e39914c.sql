-- =============================================
-- One Person One Card POC - COMPLETE DATABASE SCHEMA
-- =============================================

-- 1. Create role enum
CREATE TYPE public.app_role AS ENUM ('DEPARTMENT_ADMIN', 'ESTABLISHMENT_ADMIN', 'WORKER');

-- 2. Create attendance status enum
CREATE TYPE public.attendance_status AS ENUM ('PRESENT', 'PARTIAL', 'ABSENT');

-- 3. Create attendance event type enum
CREATE TYPE public.attendance_event_type AS ENUM ('CHECK_IN', 'CHECK_OUT');

-- =============================================
-- CORE TABLES
-- =============================================

-- Departments table
CREATE TABLE public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    state TEXT NOT NULL,
    district TEXT NOT NULL,
    mandal TEXT,
    pincode TEXT,
    address_line TEXT,
    phone TEXT,
    email TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Establishments table
CREATE TABLE public.establishments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    establishment_type TEXT,
    state TEXT NOT NULL,
    district TEXT NOT NULL,
    mandal TEXT,
    pincode TEXT,
    address_line TEXT,
    phone TEXT,
    email TEXT,
    license_number TEXT,
    construction_type TEXT,
    project_name TEXT,
    contractor_name TEXT,
    estimated_workers INTEGER,
    start_date DATE,
    expected_end_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Workers table
CREATE TABLE public.workers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id TEXT NOT NULL UNIQUE,
    employee_id TEXT UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    date_of_birth DATE,
    gender TEXT,
    phone TEXT,
    email TEXT,
    aadhaar_last_four TEXT,
    state TEXT NOT NULL,
    district TEXT NOT NULL,
    mandal TEXT,
    pincode TEXT,
    address_line TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    skills TEXT[],
    experience_years INTEGER,
    photo_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Worker mappings table (enforces single active mapping per worker)
CREATE TABLE public.worker_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
    establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
    mapped_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    mapped_by UUID REFERENCES auth.users(id),
    unmapped_at TIMESTAMPTZ,
    unmapped_by UUID REFERENCES auth.users(id),
    is_active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_active_worker_mapping UNIQUE (worker_id, is_active) 
);

-- Create partial unique index for single active mapping
DROP INDEX IF EXISTS idx_unique_active_worker_mapping;
CREATE UNIQUE INDEX idx_unique_active_worker_mapping 
ON public.worker_mappings (worker_id) 
WHERE is_active = true;

-- Profiles table (links auth.users to domain entities)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    avatar_url TEXT,
    worker_id UUID REFERENCES public.workers(id) ON DELETE SET NULL,
    establishment_id UUID REFERENCES public.establishments(id) ON DELETE SET NULL,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- =============================================
-- ATTENDANCE TABLES
-- =============================================

-- Attendance events table (append-only)
CREATE TABLE public.attendance_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
    event_type attendance_event_type NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    region TEXT NOT NULL,
    establishment_id UUID REFERENCES public.establishments(id),
    meta JSONB DEFAULT '{"timezone": "Asia/Kolkata"}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Attendance daily rollups table
CREATE TABLE public.attendance_daily_rollups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    first_checkin_at TIMESTAMPTZ,
    last_checkout_at TIMESTAMPTZ,
    status attendance_status NOT NULL DEFAULT 'ABSENT',
    establishment_id UUID REFERENCES public.establishments(id),
    total_hours NUMERIC(5,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (worker_id, attendance_date)
);

-- =============================================
-- AUDIT LOGS TABLE
-- =============================================

CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID,
    action TEXT NOT NULL,
    old_data JSONB,
    new_data JSONB,
    performed_by UUID REFERENCES auth.users(id),
    performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ip_address TEXT,
    user_agent TEXT
);

-- =============================================
-- INDEXES
-- =============================================

-- Departments indexes
CREATE INDEX idx_departments_state ON public.departments(state);
CREATE INDEX idx_departments_district ON public.departments(district);
CREATE INDEX idx_departments_is_active ON public.departments(is_active);

-- Establishments indexes
CREATE INDEX idx_establishments_department_id ON public.establishments(department_id);
CREATE INDEX idx_establishments_state ON public.establishments(state);
CREATE INDEX idx_establishments_district ON public.establishments(district);
CREATE INDEX idx_establishments_is_active ON public.establishments(is_active);

-- Workers indexes
CREATE INDEX idx_workers_worker_id ON public.workers(worker_id);
CREATE INDEX idx_workers_employee_id ON public.workers(employee_id);
CREATE INDEX idx_workers_state ON public.workers(state);
CREATE INDEX idx_workers_district ON public.workers(district);
CREATE INDEX idx_workers_is_active ON public.workers(is_active);
CREATE INDEX idx_workers_name ON public.workers(first_name, last_name);

-- Worker mappings indexes
CREATE INDEX idx_worker_mappings_worker_id ON public.worker_mappings(worker_id);
CREATE INDEX idx_worker_mappings_establishment_id ON public.worker_mappings(establishment_id);
CREATE INDEX idx_worker_mappings_is_active ON public.worker_mappings(is_active);

-- Profiles indexes
CREATE INDEX idx_profiles_auth_user_id ON public.profiles(auth_user_id);
CREATE INDEX idx_profiles_worker_id ON public.profiles(worker_id);
CREATE INDEX idx_profiles_establishment_id ON public.profiles(establishment_id);
CREATE INDEX idx_profiles_department_id ON public.profiles(department_id);

-- User roles indexes
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);

-- Attendance events indexes
CREATE INDEX idx_attendance_events_worker_id ON public.attendance_events(worker_id);
CREATE INDEX idx_attendance_events_occurred_at ON public.attendance_events(occurred_at);
CREATE INDEX idx_attendance_events_event_type ON public.attendance_events(event_type);
CREATE INDEX idx_attendance_events_region ON public.attendance_events(region);
CREATE INDEX idx_attendance_events_worker_date ON public.attendance_events(worker_id, occurred_at DESC);

-- Attendance daily rollups indexes
CREATE INDEX idx_attendance_rollups_worker_id ON public.attendance_daily_rollups(worker_id);
CREATE INDEX idx_attendance_rollups_date ON public.attendance_daily_rollups(attendance_date);
CREATE INDEX idx_attendance_rollups_status ON public.attendance_daily_rollups(status);
CREATE INDEX idx_attendance_rollups_establishment_id ON public.attendance_daily_rollups(establishment_id);
CREATE INDEX idx_attendance_rollups_worker_date ON public.attendance_daily_rollups(worker_id, attendance_date DESC);

-- Audit logs indexes
CREATE INDEX idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX idx_audit_logs_record_id ON public.audit_logs(record_id);
CREATE INDEX idx_audit_logs_performed_at ON public.audit_logs(performed_at DESC);
CREATE INDEX idx_audit_logs_performed_by ON public.audit_logs(performed_by);

-- =============================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.establishments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_daily_rollups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- SECURITY DEFINER FUNCTIONS
-- =============================================

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- Function to get user's role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role
    FROM public.user_roles
    WHERE user_id = _user_id
    LIMIT 1
$$;

-- Function to get user's department_id
CREATE OR REPLACE FUNCTION public.get_user_department_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT department_id
    FROM public.profiles
    WHERE auth_user_id = _user_id
    LIMIT 1
$$;

-- Function to get user's establishment_id
CREATE OR REPLACE FUNCTION public.get_user_establishment_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT establishment_id
    FROM public.profiles
    WHERE auth_user_id = _user_id
    LIMIT 1
$$;

-- Function to get user's worker_id
CREATE OR REPLACE FUNCTION public.get_user_worker_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT worker_id
    FROM public.profiles
    WHERE auth_user_id = _user_id
    LIMIT 1
$$;

-- =============================================
-- RLS POLICIES - DEPARTMENTS
-- =============================================

-- Department admins can view their own department
CREATE POLICY "Department admins can view own department"
ON public.departments FOR SELECT
TO authenticated
USING (
    public.has_role(auth.uid(), 'DEPARTMENT_ADMIN') 
    AND id = public.get_user_department_id(auth.uid())
);

-- Department admins can update their own department
CREATE POLICY "Department admins can update own department"
ON public.departments FOR UPDATE
TO authenticated
USING (
    public.has_role(auth.uid(), 'DEPARTMENT_ADMIN') 
    AND id = public.get_user_department_id(auth.uid())
);

-- =============================================
-- RLS POLICIES - ESTABLISHMENTS
-- =============================================

-- Department admins can view establishments in their department
CREATE POLICY "Department admins can view department establishments"
ON public.establishments FOR SELECT
TO authenticated
USING (
    public.has_role(auth.uid(), 'DEPARTMENT_ADMIN') 
    AND department_id = public.get_user_department_id(auth.uid())
);

-- Establishment admins can view their own establishment
CREATE POLICY "Establishment admins can view own establishment"
ON public.establishments FOR SELECT
TO authenticated
USING (
    public.has_role(auth.uid(), 'ESTABLISHMENT_ADMIN') 
    AND id = public.get_user_establishment_id(auth.uid())
);

-- Establishment admins can update their own establishment
CREATE POLICY "Establishment admins can update own establishment"
ON public.establishments FOR UPDATE
TO authenticated
USING (
    public.has_role(auth.uid(), 'ESTABLISHMENT_ADMIN') 
    AND id = public.get_user_establishment_id(auth.uid())
);

-- =============================================
-- RLS POLICIES - WORKERS
-- =============================================

-- Workers can view their own record
CREATE POLICY "Workers can view own record"
ON public.workers FOR SELECT
TO authenticated
USING (
    public.has_role(auth.uid(), 'WORKER') 
    AND id = public.get_user_worker_id(auth.uid())
);

-- Workers can update their own record (limited fields handled in app)
CREATE POLICY "Workers can update own record"
ON public.workers FOR UPDATE
TO authenticated
USING (
    public.has_role(auth.uid(), 'WORKER') 
    AND id = public.get_user_worker_id(auth.uid())
);

-- Establishment admins can view workers mapped to their establishment
CREATE POLICY "Establishment admins can view mapped workers"
ON public.workers FOR SELECT
TO authenticated
USING (
    public.has_role(auth.uid(), 'ESTABLISHMENT_ADMIN') 
    AND EXISTS (
        SELECT 1 FROM public.worker_mappings wm
        WHERE wm.worker_id = workers.id
        AND wm.establishment_id = public.get_user_establishment_id(auth.uid())
        AND wm.is_active = true
    )
);

-- Establishment admins can view unmapped workers for mapping
CREATE POLICY "Establishment admins can view unmapped workers"
ON public.workers FOR SELECT
TO authenticated
USING (
    public.has_role(auth.uid(), 'ESTABLISHMENT_ADMIN') 
    AND NOT EXISTS (
        SELECT 1 FROM public.worker_mappings wm
        WHERE wm.worker_id = workers.id
        AND wm.is_active = true
    )
);

-- Department admins can view all workers in their department's establishments
CREATE POLICY "Department admins can view department workers"
ON public.workers FOR SELECT
TO authenticated
USING (
    public.has_role(auth.uid(), 'DEPARTMENT_ADMIN') 
    AND EXISTS (
        SELECT 1 FROM public.worker_mappings wm
        JOIN public.establishments e ON e.id = wm.establishment_id
        WHERE wm.worker_id = workers.id
        AND e.department_id = public.get_user_department_id(auth.uid())
    )
);

-- Department admins can view all unmapped workers
CREATE POLICY "Department admins can view all unmapped workers"
ON public.workers FOR SELECT
TO authenticated
USING (
    public.has_role(auth.uid(), 'DEPARTMENT_ADMIN') 
    AND NOT EXISTS (
        SELECT 1 FROM public.worker_mappings wm
        WHERE wm.worker_id = workers.id
        AND wm.is_active = true
    )
);

-- =============================================
-- RLS POLICIES - WORKER MAPPINGS
-- =============================================

-- Establishment admins can view mappings for their establishment
CREATE POLICY "Establishment admins can view own mappings"
ON public.worker_mappings FOR SELECT
TO authenticated
USING (
    public.has_role(auth.uid(), 'ESTABLISHMENT_ADMIN') 
    AND establishment_id = public.get_user_establishment_id(auth.uid())
);

-- Establishment admins can insert mappings for their establishment
CREATE POLICY "Establishment admins can create mappings"
ON public.worker_mappings FOR INSERT
TO authenticated
WITH CHECK (
    public.has_role(auth.uid(), 'ESTABLISHMENT_ADMIN') 
    AND establishment_id = public.get_user_establishment_id(auth.uid())
);

-- Establishment admins can update mappings for their establishment
CREATE POLICY "Establishment admins can update mappings"
ON public.worker_mappings FOR UPDATE
TO authenticated
USING (
    public.has_role(auth.uid(), 'ESTABLISHMENT_ADMIN') 
    AND establishment_id = public.get_user_establishment_id(auth.uid())
);

-- Department admins can view all mappings in their department
CREATE POLICY "Department admins can view department mappings"
ON public.worker_mappings FOR SELECT
TO authenticated
USING (
    public.has_role(auth.uid(), 'DEPARTMENT_ADMIN') 
    AND EXISTS (
        SELECT 1 FROM public.establishments e
        WHERE e.id = worker_mappings.establishment_id
        AND e.department_id = public.get_user_department_id(auth.uid())
    )
);

-- Workers can view their own mapping
CREATE POLICY "Workers can view own mapping"
ON public.worker_mappings FOR SELECT
TO authenticated
USING (
    public.has_role(auth.uid(), 'WORKER') 
    AND worker_id = public.get_user_worker_id(auth.uid())
);

-- =============================================
-- RLS POLICIES - PROFILES
-- =============================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth_user_id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth_user_id = auth.uid());

-- =============================================
-- RLS POLICIES - USER ROLES
-- =============================================

-- Users can view their own roles
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- =============================================
-- RLS POLICIES - ATTENDANCE EVENTS
-- =============================================

-- Workers can view their own attendance events
CREATE POLICY "Workers can view own attendance"
ON public.attendance_events FOR SELECT
TO authenticated
USING (
    public.has_role(auth.uid(), 'WORKER') 
    AND worker_id = public.get_user_worker_id(auth.uid())
);

-- Establishment admins can view attendance for mapped workers
CREATE POLICY "Establishment admins can view worker attendance"
ON public.attendance_events FOR SELECT
TO authenticated
USING (
    public.has_role(auth.uid(), 'ESTABLISHMENT_ADMIN') 
    AND EXISTS (
        SELECT 1 FROM public.worker_mappings wm
        WHERE wm.worker_id = attendance_events.worker_id
        AND wm.establishment_id = public.get_user_establishment_id(auth.uid())
        AND wm.is_active = true
    )
);

-- Department admins can view all attendance in their department
CREATE POLICY "Department admins can view department attendance"
ON public.attendance_events FOR SELECT
TO authenticated
USING (
    public.has_role(auth.uid(), 'DEPARTMENT_ADMIN') 
    AND EXISTS (
        SELECT 1 FROM public.worker_mappings wm
        JOIN public.establishments e ON e.id = wm.establishment_id
        WHERE wm.worker_id = attendance_events.worker_id
        AND e.department_id = public.get_user_department_id(auth.uid())
    )
);

-- =============================================
-- RLS POLICIES - ATTENDANCE DAILY ROLLUPS
-- =============================================

-- Workers can view their own rollups
CREATE POLICY "Workers can view own rollups"
ON public.attendance_daily_rollups FOR SELECT
TO authenticated
USING (
    public.has_role(auth.uid(), 'WORKER') 
    AND worker_id = public.get_user_worker_id(auth.uid())
);

-- Establishment admins can view rollups for mapped workers
CREATE POLICY "Establishment admins can view worker rollups"
ON public.attendance_daily_rollups FOR SELECT
TO authenticated
USING (
    public.has_role(auth.uid(), 'ESTABLISHMENT_ADMIN') 
    AND EXISTS (
        SELECT 1 FROM public.worker_mappings wm
        WHERE wm.worker_id = attendance_daily_rollups.worker_id
        AND wm.establishment_id = public.get_user_establishment_id(auth.uid())
        AND wm.is_active = true
    )
);

-- Department admins can view all rollups in their department
CREATE POLICY "Department admins can view department rollups"
ON public.attendance_daily_rollups FOR SELECT
TO authenticated
USING (
    public.has_role(auth.uid(), 'DEPARTMENT_ADMIN') 
    AND EXISTS (
        SELECT 1 FROM public.worker_mappings wm
        JOIN public.establishments e ON e.id = wm.establishment_id
        WHERE wm.worker_id = attendance_daily_rollups.worker_id
        AND e.department_id = public.get_user_department_id(auth.uid())
    )
);

-- =============================================
-- RLS POLICIES - AUDIT LOGS
-- =============================================

-- Only department admins can view audit logs for their department
CREATE POLICY "Department admins can view audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'DEPARTMENT_ADMIN'));

-- =============================================
-- UPDATED_AT TRIGGER FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_departments_updated_at
    BEFORE UPDATE ON public.departments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_establishments_updated_at
    BEFORE UPDATE ON public.establishments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workers_updated_at
    BEFORE UPDATE ON public.workers
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_worker_mappings_updated_at
    BEFORE UPDATE ON public.worker_mappings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_attendance_rollups_updated_at
    BEFORE UPDATE ON public.attendance_daily_rollups
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- WORKER ID GENERATION FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION public.generate_worker_id()
RETURNS TEXT AS $$
DECLARE
    new_id TEXT;
    counter INTEGER;
BEGIN
    SELECT COUNT(*) + 1 INTO counter FROM public.workers;
    new_id := 'WKR' || LPAD(counter::TEXT, 8, '0');
    RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- ATTENDANCE ROLLUP FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION public.update_attendance_rollup()
RETURNS TRIGGER AS $$
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
    
    -- Get current establishment mapping
    SELECT establishment_id INTO mapped_establishment_id
    FROM public.worker_mappings
    WHERE worker_id = NEW.worker_id AND is_active = true
    LIMIT 1;
    
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for attendance rollup
CREATE TRIGGER trigger_update_attendance_rollup
    AFTER INSERT ON public.attendance_events
    FOR EACH ROW EXECUTE FUNCTION public.update_attendance_rollup();