import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AttendanceStatus } from '@/lib/types';

interface AttendanceRollup {
  id: string;
  worker_id: string;
  attendance_date: string;
  first_checkin_at: string | null;
  last_checkout_at: string | null;
  status: AttendanceStatus;
  total_hours: number | null;
}

interface WorkerProfile {
  id: string;
  worker_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  state: string;
  district: string;
  is_active: boolean;
}

// Get today's date in YYYY-MM-DD format for Asia/Kolkata
const getTodayDate = () => {
  const now = new Date();
  return now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
};

// Worker Dashboard Hooks
export function useWorkerProfile(workerId: string | undefined) {
  return useQuery({
    queryKey: ['worker-profile', workerId],
    queryFn: async () => {
      if (!workerId) return null;
      const { data, error } = await supabase
        .from('workers')
        .select('*')
        .eq('id', workerId)
        .maybeSingle();
      
      if (error) throw error;
      return data as WorkerProfile | null;
    },
    enabled: !!workerId,
  });
}

export function useWorkerTodayAttendance(workerId: string | undefined) {
  const today = getTodayDate();
  
  return useQuery({
    queryKey: ['worker-today-attendance', workerId, today],
    queryFn: async () => {
      if (!workerId) return null;
      const { data, error } = await supabase
        .from('attendance_daily_rollups')
        .select('*')
        .eq('worker_id', workerId)
        .eq('attendance_date', today)
        .maybeSingle();
      
      if (error) throw error;
      return data as AttendanceRollup | null;
    },
    enabled: !!workerId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useWorkerAttendanceHistory(workerId: string | undefined, days: number = 30) {
  return useQuery({
    queryKey: ['worker-attendance-history', workerId, days],
    queryFn: async () => {
      if (!workerId) return [];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const { data, error } = await supabase
        .from('attendance_daily_rollups')
        .select('*')
        .eq('worker_id', workerId)
        .gte('attendance_date', startDate.toISOString().split('T')[0])
        .order('attendance_date', { ascending: false });
      
      if (error) throw error;
      return data as AttendanceRollup[];
    },
    enabled: !!workerId,
  });
}

export function useWorkerMonthlyStats(workerId: string | undefined) {
  return useQuery({
    queryKey: ['worker-monthly-stats', workerId],
    queryFn: async () => {
      if (!workerId) return { present: 0, partial: 0, absent: 0, total: 0 };
      
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const { data, error } = await supabase
        .from('attendance_daily_rollups')
        .select('status')
        .eq('worker_id', workerId)
        .gte('attendance_date', startOfMonth.toISOString().split('T')[0]);
      
      if (error) throw error;
      
      const stats = { present: 0, partial: 0, absent: 0, total: data?.length || 0 };
      data?.forEach(row => {
        if (row.status === 'PRESENT') stats.present++;
        else if (row.status === 'PARTIAL') stats.partial++;
        else stats.absent++;
      });
      
      return stats;
    },
    enabled: !!workerId,
  });
}

// Establishment Dashboard Hooks
export function useEstablishmentWorkers(establishmentId: string | undefined) {
  return useQuery({
    queryKey: ['establishment-workers', establishmentId],
    queryFn: async () => {
      if (!establishmentId) return [];
      
      const { data, error } = await supabase
        .from('worker_mappings')
        .select(`
          id,
          worker_id,
          mapped_at,
          is_active,
          workers (
            id,
            worker_id,
            first_name,
            last_name,
            phone,
            state,
            district,
            is_active
          )
        `)
        .eq('establishment_id', establishmentId)
        .eq('is_active', true);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!establishmentId,
  });
}

export function useEstablishmentTodayAttendance(establishmentId: string | undefined) {
  const today = getTodayDate();
  
  return useQuery({
    queryKey: ['establishment-today-attendance', establishmentId, today],
    queryFn: async () => {
      if (!establishmentId) return { present: 0, partial: 0, absent: 0, total: 0 };
      
      const { data, error } = await supabase
        .from('attendance_daily_rollups')
        .select('status, worker_id')
        .eq('establishment_id', establishmentId)
        .eq('attendance_date', today);
      
      if (error) throw error;
      
      const stats = { present: 0, partial: 0, absent: 0, total: 0 };
      
      // Get total mapped workers
      const { count } = await supabase
        .from('worker_mappings')
        .select('*', { count: 'exact', head: true })
        .eq('establishment_id', establishmentId)
        .eq('is_active', true);
      
      stats.total = count || 0;
      
      data?.forEach(row => {
        if (row.status === 'PRESENT') stats.present++;
        else if (row.status === 'PARTIAL') stats.partial++;
      });
      
      stats.absent = stats.total - stats.present - stats.partial;
      
      return stats;
    },
    enabled: !!establishmentId,
    refetchInterval: 30000,
  });
}

// Department Dashboard Hooks
export function useDepartmentEstablishments(departmentId: string | undefined) {
  return useQuery({
    queryKey: ['department-establishments', departmentId],
    queryFn: async () => {
      if (!departmentId) return [];
      
      const { data, error } = await supabase
        .from('establishments')
        .select('*')
        .eq('department_id', departmentId)
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!departmentId,
  });
}

export function useDepartmentStats(departmentId: string | undefined) {
  const today = getTodayDate();
  
  return useQuery({
    queryKey: ['department-stats', departmentId, today],
    queryFn: async () => {
      if (!departmentId) return { establishments: 0, totalWorkers: 0, presentToday: 0, attendanceRate: 0 };
      
      // Get establishments count
      const { count: estCount } = await supabase
        .from('establishments')
        .select('*', { count: 'exact', head: true })
        .eq('department_id', departmentId)
        .eq('is_active', true);
      
      // Get establishment IDs
      const { data: establishments } = await supabase
        .from('establishments')
        .select('id')
        .eq('department_id', departmentId)
        .eq('is_active', true);
      
      const estIds = establishments?.map(e => e.id) || [];
      
      if (estIds.length === 0) {
        return { establishments: estCount || 0, totalWorkers: 0, presentToday: 0, attendanceRate: 0 };
      }
      
      // Get total workers mapped to these establishments
      const { count: workerCount } = await supabase
        .from('worker_mappings')
        .select('*', { count: 'exact', head: true })
        .in('establishment_id', estIds)
        .eq('is_active', true);
      
      // Get today's attendance
      const { data: attendanceData } = await supabase
        .from('attendance_daily_rollups')
        .select('status')
        .in('establishment_id', estIds)
        .eq('attendance_date', today);
      
      const presentToday = attendanceData?.filter(a => a.status === 'PRESENT').length || 0;
      const totalWorkers = workerCount || 0;
      const attendanceRate = totalWorkers > 0 ? Math.round((presentToday / totalWorkers) * 100) : 0;
      
      return {
        establishments: estCount || 0,
        totalWorkers,
        presentToday,
        attendanceRate,
      };
    },
    enabled: !!departmentId,
    refetchInterval: 60000,
  });
}

// Unmapped workers hook for establishment to map
export function useUnmappedWorkers() {
  return useQuery({
    queryKey: ['unmapped-workers'],
    queryFn: async () => {
      // Get workers that don't have an active mapping
      const { data: mappedWorkerIds } = await supabase
        .from('worker_mappings')
        .select('worker_id')
        .eq('is_active', true);
      
      const mappedIds = mappedWorkerIds?.map(m => m.worker_id) || [];
      
      let query = supabase
        .from('workers')
        .select('id, worker_id, first_name, last_name, phone, state, district')
        .eq('is_active', true)
        .order('first_name');
      
      if (mappedIds.length > 0) {
        query = query.not('id', 'in', `(${mappedIds.join(',')})`);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    },
  });
}
