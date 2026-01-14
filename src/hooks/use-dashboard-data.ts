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
  establishment_id: string | null;
}

export interface AttendanceRollupWithEstablishment extends AttendanceRollup {
  establishments: {
    id: string;
    name: string;
    district: string;
    mandal: string | null;
    state: string;
  } | null;
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

export interface TrendDataPoint {
  date: string;
  present: number;
  partial: number;
  absent: number;
  total: number;
  rate: number;
}

// Get today's date in YYYY-MM-DD format for Asia/Kolkata
const getTodayDate = () => {
  const now = new Date();
  return now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
};

// Get date N days ago in YYYY-MM-DD format
const getDateDaysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
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

// Fetch worker's current establishment mapping
export function useWorkerEstablishment(workerId: string | undefined) {
  return useQuery({
    queryKey: ['worker-establishment', workerId],
    queryFn: async () => {
      if (!workerId) return null;
      const { data, error } = await supabase
        .from('worker_mappings')
        .select(`
          id,
          establishment_id,
          mapped_at,
          establishments (
            id,
            name,
            code,
            district,
            state
          )
        `)
        .eq('worker_id', workerId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return data;
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

export function useWorkerAttendanceHistory(
  workerId: string | undefined,
  startDate?: string,
  endDate?: string
) {
  return useQuery({
    queryKey: ['worker-attendance-history', workerId, startDate, endDate],
    queryFn: async () => {
      if (!workerId) return [];

      // Default to last 30 days if no dates provided
      const start = startDate || getDateDaysAgo(30);
      const end = endDate || getTodayDate();

      const { data, error } = await supabase
        .from('attendance_daily_rollups')
        .select(`
          *,
          establishments (
            id,
            name,
            district,
            mandal,
            state
          )
        `)
        .eq('worker_id', workerId)
        .gte('attendance_date', start)
        .lte('attendance_date', end)
        .order('attendance_date', { ascending: false });

      if (error) throw error;
      return data as AttendanceRollupWithEstablishment[];
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
  const today = getTodayDate();

  return useQuery({
    queryKey: ['department-establishments', departmentId, today],
    queryFn: async () => {
      if (!departmentId) return [];

      const { data: establishments, error } = await supabase
        .from('establishments')
        .select('*')
        .eq('department_id', departmentId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      if (!establishments || establishments.length === 0) return [];

      // Fetch worker counts and attendance stats for each establishment
      const enrichedEstablishments = await Promise.all(
        establishments.map(async (est) => {
          // Get worker count
          const { count: workerCount } = await supabase
            .from('worker_mappings')
            .select('*', { count: 'exact', head: true })
            .eq('establishment_id', est.id)
            .eq('is_active', true);

          // Get today's attendance
          const { data: attendanceData } = await supabase
            .from('attendance_daily_rollups')
            .select('status')
            .eq('establishment_id', est.id)
            .eq('attendance_date', today);

          const present = attendanceData?.filter(a => a.status === 'PRESENT').length || 0;
          const partial = attendanceData?.filter(a => a.status === 'PARTIAL').length || 0;
          const total = workerCount || 0;
          const absent = total - present - partial;

          return {
            ...est,
            workerCount: total,
            todayStats: {
              present,
              partial,
              absent,
              rate: total > 0 ? Math.round((present / total) * 100) : 0,
            },
          };
        })
      );

      return enrichedEstablishments;
    },
    enabled: !!departmentId,
    refetchInterval: 60000,
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

// Department Workers hook - fetch all workers mapped to department establishments
export function useDepartmentWorkers(departmentId: string | undefined) {
  return useQuery({
    queryKey: ['department-workers', departmentId],
    queryFn: async () => {
      if (!departmentId) return [];

      // Get establishment IDs for this department
      const { data: establishments } = await supabase
        .from('establishments')
        .select('id')
        .eq('department_id', departmentId)
        .eq('is_active', true);

      const estIds = establishments?.map(e => e.id) || [];

      if (estIds.length === 0) return [];

      // Get workers mapped to these establishments
      const { data, error } = await supabase
        .from('worker_mappings')
        .select(`
          id,
          establishment_id,
          establishments!inner(name, code),
          workers!inner(id, worker_id, first_name, last_name, phone, state, district, is_active)
        `)
        .in('establishment_id', estIds)
        .eq('is_active', true);

      if (error) throw error;
      return data || [];
    },
    enabled: !!departmentId,
  });
}


// Unmapped / Pending Workers
export function useUnmappedWorkers(departmentDistrict?: string) {
  return useQuery({
    queryKey: ['unmapped-workers', departmentDistrict],
    queryFn: async () => {
      // Get workers that don't have an active mapping OR are status='new'
      const { data: mappedWorkerIds } = await supabase
        .from('worker_mappings')
        .select('worker_id')
        .eq('is_active', true);

      const mappedIds = mappedWorkerIds?.map(m => m.worker_id) || [];

      let query = supabase
        .from('workers')
        .select('id, worker_id, first_name, last_name, phone, state, district, status, is_active')
        .order('created_at', { ascending: false });

      // If we have a district filter, use it - DISABLED for now to ensure all new registrations are seen
      // if (departmentDistrict) {
      //   query = query.eq('district', departmentDistrict);
      // }

      const { data, error } = await query;

      if (error) throw error;

      // Filter out those who are ALREADY mapped (active in another establishment)
      // BUT keep those who are 'new' (even if unmapped) or 'active' but unmapped.
      return data?.filter(w => !mappedIds.includes(w.id)) || [];
    },
    enabled: true,
  });
}

// Worker Attendance Trend (last 7 days)
export function useWorkerAttendanceTrend(workerId: string | undefined, days: number = 7) {
  return useQuery({
    queryKey: ['worker-attendance-trend', workerId, days],
    queryFn: async (): Promise<TrendDataPoint[]> => {
      if (!workerId) return [];

      const startDate = getDateDaysAgo(days);

      const { data, error } = await supabase
        .from('attendance_daily_rollups')
        .select('attendance_date, status')
        .eq('worker_id', workerId)
        .gte('attendance_date', startDate)
        .order('attendance_date', { ascending: true });

      if (error) throw error;

      // Build trend data - group by date
      const trendMap = new Map<string, TrendDataPoint>();

      // Initialize all days in range
      for (let i = days; i >= 0; i--) {
        const date = getDateDaysAgo(i);
        trendMap.set(date, { date, present: 0, partial: 0, absent: 0, total: 1, rate: 0 });
      }

      // Fill in actual data
      data?.forEach(row => {
        const point = trendMap.get(row.attendance_date);
        if (point) {
          if (row.status === 'PRESENT') {
            point.present = 1;
            point.rate = 100;
          } else if (row.status === 'PARTIAL') {
            point.partial = 1;
            point.rate = 50;
          } else {
            point.absent = 1;
            point.rate = 0;
          }
        }
      });

      return Array.from(trendMap.values());
    },
    enabled: !!workerId,
  });
}

// Establishment Attendance Trend (last 7 days)
export function useEstablishmentAttendanceTrend(establishmentId: string | undefined, days: number = 7) {
  return useQuery({
    queryKey: ['establishment-attendance-trend', establishmentId, days],
    queryFn: async (): Promise<TrendDataPoint[]> => {
      if (!establishmentId) return [];

      const startDate = getDateDaysAgo(days);

      // Get total worker count for this establishment
      const { count: totalWorkers } = await supabase
        .from('worker_mappings')
        .select('*', { count: 'exact', head: true })
        .eq('establishment_id', establishmentId)
        .eq('is_active', true);

      const total = totalWorkers || 0;

      const { data, error } = await supabase
        .from('attendance_daily_rollups')
        .select('attendance_date, status')
        .eq('establishment_id', establishmentId)
        .gte('attendance_date', startDate)
        .order('attendance_date', { ascending: true });

      if (error) throw error;

      // Build trend data - group by date
      const trendMap = new Map<string, TrendDataPoint>();

      // Initialize all days in range
      for (let i = days; i >= 0; i--) {
        const date = getDateDaysAgo(i);
        trendMap.set(date, { date, present: 0, partial: 0, absent: total, total, rate: 0 });
      }

      // Fill in actual data
      data?.forEach(row => {
        const point = trendMap.get(row.attendance_date);
        if (point) {
          if (row.status === 'PRESENT') {
            point.present++;
            point.absent--;
          } else if (row.status === 'PARTIAL') {
            point.partial++;
            point.absent--;
          }
        }
      });

      // Calculate rates
      trendMap.forEach(point => {
        point.rate = point.total > 0 ? Math.round((point.present / point.total) * 100) : 0;
      });

      return Array.from(trendMap.values());
    },
    enabled: !!establishmentId,
  });
}

// Establishment Attendance Trend by Date Range
export function useEstablishmentAttendanceTrendByRange(
  establishmentId: string | undefined,
  startDate?: string,
  endDate?: string
) {
  return useQuery({
    queryKey: ['establishment-attendance-trend-range', establishmentId, startDate, endDate],
    queryFn: async (): Promise<TrendDataPoint[]> => {
      if (!establishmentId || !startDate || !endDate) return [];

      // Get total worker count for this establishment
      const { count: totalWorkers } = await supabase
        .from('worker_mappings')
        .select('*', { count: 'exact', head: true })
        .eq('establishment_id', establishmentId)
        .eq('is_active', true);

      const total = totalWorkers || 0;

      const { data, error } = await supabase
        .from('attendance_daily_rollups')
        .select('attendance_date, status')
        .eq('establishment_id', establishmentId)
        .gte('attendance_date', startDate)
        .lte('attendance_date', endDate)
        .order('attendance_date', { ascending: true });

      if (error) throw error;

      // Build trend data - group by date
      const trendMap = new Map<string, TrendDataPoint>();

      // Initialize all days in range
      const start = new Date(startDate);
      const end = new Date(endDate);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        trendMap.set(dateStr, { date: dateStr, present: 0, partial: 0, absent: total, total, rate: 0 });
      }

      // Fill in actual data
      data?.forEach(row => {
        const point = trendMap.get(row.attendance_date);
        if (point) {
          if (row.status === 'PRESENT') {
            point.present++;
            point.absent--;
          } else if (row.status === 'PARTIAL') {
            point.partial++;
            point.absent--;
          }
        }
      });

      // Calculate rates
      trendMap.forEach(point => {
        point.rate = point.total > 0 ? Math.round((point.present / point.total) * 100) : 0;
      });

      return Array.from(trendMap.values());
    },
    enabled: !!establishmentId && !!startDate && !!endDate,
  });
}

// Department Attendance Trend (last 7 days)
export function useDepartmentAttendanceTrend(departmentId: string | undefined, days: number = 7) {
  return useQuery({
    queryKey: ['department-attendance-trend', departmentId, days],
    queryFn: async (): Promise<TrendDataPoint[]> => {
      if (!departmentId) return [];

      const startDate = getDateDaysAgo(days);

      // Get establishment IDs for this department
      const { data: establishments } = await supabase
        .from('establishments')
        .select('id')
        .eq('department_id', departmentId)
        .eq('is_active', true);

      const estIds = establishments?.map(e => e.id) || [];

      if (estIds.length === 0) return [];

      // Get total worker count
      const { count: totalWorkers } = await supabase
        .from('worker_mappings')
        .select('*', { count: 'exact', head: true })
        .in('establishment_id', estIds)
        .eq('is_active', true);

      const total = totalWorkers || 0;

      const { data, error } = await supabase
        .from('attendance_daily_rollups')
        .select('attendance_date, status')
        .in('establishment_id', estIds)
        .gte('attendance_date', startDate)
        .order('attendance_date', { ascending: true });

      if (error) throw error;

      // Build trend data - group by date
      const trendMap = new Map<string, TrendDataPoint>();

      // Initialize all days in range
      for (let i = days; i >= 0; i--) {
        const date = getDateDaysAgo(i);
        trendMap.set(date, { date, present: 0, partial: 0, absent: total, total, rate: 0 });
      }

      // Fill in actual data
      data?.forEach(row => {
        const point = trendMap.get(row.attendance_date);
        if (point) {
          if (row.status === 'PRESENT') {
            point.present++;
            point.absent--;
          } else if (row.status === 'PARTIAL') {
            point.partial++;
            point.absent--;
          }
        }
      });

      // Calculate rates
      trendMap.forEach(point => {
        point.rate = point.total > 0 ? Math.round((point.present / point.total) * 100) : 0;
      });

      return Array.from(trendMap.values());
    },
    enabled: !!departmentId,
  });
}

// Department Attendance Trend by Date Range
export function useDepartmentAttendanceTrendByRange(
  departmentId: string | undefined,
  startDate?: string,
  endDate?: string
) {
  return useQuery({
    queryKey: ['department-attendance-trend-range', departmentId, startDate, endDate],
    queryFn: async (): Promise<TrendDataPoint[]> => {
      if (!departmentId || !startDate || !endDate) return [];

      // Get establishment IDs for this department
      const { data: establishments } = await supabase
        .from('establishments')
        .select('id')
        .eq('department_id', departmentId)
        .eq('is_active', true);

      const estIds = establishments?.map(e => e.id) || [];

      if (estIds.length === 0) return [];

      // Get total worker count
      const { count: totalWorkers } = await supabase
        .from('worker_mappings')
        .select('*', { count: 'exact', head: true })
        .in('establishment_id', estIds)
        .eq('is_active', true);

      const total = totalWorkers || 0;

      const { data, error } = await supabase
        .from('attendance_daily_rollups')
        .select('attendance_date, status')
        .in('establishment_id', estIds)
        .gte('attendance_date', startDate)
        .lte('attendance_date', endDate)
        .order('attendance_date', { ascending: true });

      if (error) throw error;

      // Build trend data - group by date
      const trendMap = new Map<string, TrendDataPoint>();

      // Initialize all days in range
      const start = new Date(startDate);
      const end = new Date(endDate);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        trendMap.set(dateStr, { date: dateStr, present: 0, partial: 0, absent: total, total, rate: 0 });
      }

      // Fill in actual data
      data?.forEach(row => {
        const point = trendMap.get(row.attendance_date);
        if (point) {
          if (row.status === 'PRESENT') {
            point.present++;
            point.absent--;
          } else if (row.status === 'PARTIAL') {
            point.partial++;
            point.absent--;
          }
        }
      });

      // Calculate rates
      trendMap.forEach(point => {
        point.rate = point.total > 0 ? Math.round((point.present / point.total) * 100) : 0;
      });

      return Array.from(trendMap.values());
    },
    enabled: !!departmentId && !!startDate && !!endDate,
  });
}
