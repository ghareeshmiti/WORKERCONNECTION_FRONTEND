import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AttendanceReportRow {
  id: string;
  date: string;
  workerId: string;
  workerName: string;
  establishmentName: string;
  departmentName: string;
  checkIn: string | null;
  checkOut: string | null;
  hoursWorked: number | null;
  status: 'PRESENT' | 'PARTIAL' | 'ABSENT';
}

export interface AttendanceReportFilters {
  startDate: string;
  endDate: string;
  establishmentId?: string;
  workerId?: string;
}

// Department-level attendance report with full historical accuracy
export function useDepartmentAttendanceReport(
  departmentId: string | undefined,
  filters: AttendanceReportFilters
) {
  return useQuery({
    queryKey: ['department-attendance-report', departmentId, filters],
    queryFn: async (): Promise<AttendanceReportRow[]> => {
      if (!departmentId || !filters.startDate || !filters.endDate) return [];

      // Get department name
      const { data: deptData } = await supabase
        .from('departments')
        .select('name')
        .eq('id', departmentId)
        .single();

      const departmentName = deptData?.name || 'Unknown';

      // Get establishment IDs for this department
      const { data: establishments } = await supabase
        .from('establishments')
        .select('id, name')
        .eq('department_id', departmentId)
        .eq('is_active', true);

      const estMap = new Map(establishments?.map(e => [e.id, e.name]) || []);
      let estIds = Array.from(estMap.keys());

      // Filter by specific establishment if provided
      if (filters.establishmentId) {
        estIds = estIds.filter(id => id === filters.establishmentId);
      }

      if (estIds.length === 0) return [];

      // Build query for rollups - uses stored establishment_id for historical accuracy
      let query = supabase
        .from('attendance_daily_rollups')
        .select(`
          id,
          attendance_date,
          worker_id,
          first_checkin_at,
          last_checkout_at,
          total_hours,
          status,
          establishment_id,
          workers!inner(id, worker_id, first_name, last_name)
        `)
        .in('establishment_id', estIds)
        .gte('attendance_date', filters.startDate)
        .lte('attendance_date', filters.endDate)
        .order('attendance_date', { ascending: false });

      // Filter by worker if provided
      if (filters.workerId) {
        query = query.eq('worker_id', filters.workerId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        date: row.attendance_date,
        workerId: row.workers?.worker_id || 'Unknown',
        workerName: `${row.workers?.first_name || ''} ${row.workers?.last_name || ''}`.trim(),
        establishmentName: estMap.get(row.establishment_id) || 'Unknown',
        departmentName,
        checkIn: row.first_checkin_at,
        checkOut: row.last_checkout_at,
        hoursWorked: row.total_hours,
        status: row.status,
      }));
    },
    enabled: !!departmentId && !!filters.startDate && !!filters.endDate,
  });
}

// Establishment-level attendance report with historical accuracy
export function useEstablishmentAttendanceReport(
  establishmentId: string | undefined,
  filters: AttendanceReportFilters
) {
  return useQuery({
    queryKey: ['establishment-attendance-report', establishmentId, filters],
    queryFn: async (): Promise<AttendanceReportRow[]> => {
      if (!establishmentId || !filters.startDate || !filters.endDate) return [];

      // Get establishment and department info
      const { data: estData } = await supabase
        .from('establishments')
        .select('name, departments(name)')
        .eq('id', establishmentId)
        .single();

      const establishmentName = estData?.name || 'Unknown';
      const departmentName = (estData?.departments as any)?.name || 'Unknown';

      // Query rollups - uses stored establishment_id for historical accuracy
      let query = supabase
        .from('attendance_daily_rollups')
        .select(`
          id,
          attendance_date,
          worker_id,
          first_checkin_at,
          last_checkout_at,
          total_hours,
          status,
          workers!inner(id, worker_id, first_name, last_name)
        `)
        .eq('establishment_id', establishmentId)
        .gte('attendance_date', filters.startDate)
        .lte('attendance_date', filters.endDate)
        .order('attendance_date', { ascending: false });

      // Filter by worker if provided
      if (filters.workerId) {
        query = query.eq('worker_id', filters.workerId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        date: row.attendance_date,
        workerId: row.workers?.worker_id || 'Unknown',
        workerName: `${row.workers?.first_name || ''} ${row.workers?.last_name || ''}`.trim(),
        establishmentName,
        departmentName,
        checkIn: row.first_checkin_at,
        checkOut: row.last_checkout_at,
        hoursWorked: row.total_hours,
        status: row.status,
      }));
    },
    enabled: !!establishmentId && !!filters.startDate && !!filters.endDate,
  });
}

// Get list of workers for filter dropdown (department scope)
export function useDepartmentWorkersList(departmentId: string | undefined) {
  return useQuery({
    queryKey: ['department-workers-list', departmentId],
    queryFn: async () => {
      if (!departmentId) return [];

      const { data, error } = await supabase
        .from('workers')
        .select('id, worker_id, first_name, last_name')
        .eq('department_id', departmentId)
        .eq('is_active', true)
        .order('first_name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!departmentId,
  });
}

// Get list of workers for filter dropdown (establishment scope - currently mapped)
export function useEstablishmentWorkersList(establishmentId: string | undefined) {
  return useQuery({
    queryKey: ['establishment-workers-list', establishmentId],
    queryFn: async () => {
      if (!establishmentId) return [];

      const { data, error } = await supabase
        .from('worker_mappings')
        .select('workers(id, worker_id, first_name, last_name)')
        .eq('establishment_id', establishmentId)
        .eq('is_active', true);

      if (error) throw error;
      return (data || []).map((m: any) => m.workers).filter(Boolean);
    },
    enabled: !!establishmentId,
  });
}

// Get establishments for filter dropdown (department scope)
export function useDepartmentEstablishmentsList(departmentId: string | undefined) {
  return useQuery({
    queryKey: ['department-establishments-list', departmentId],
    queryFn: async () => {
      if (!departmentId) return [];

      const { data, error } = await supabase
        .from('establishments')
        .select('id, name, code')
        .eq('department_id', departmentId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!departmentId,
  });
}
