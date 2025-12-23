import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface OverviewStats {
  totalDepartments: number;
  activeDepartments: number;
  totalEstablishments: number;
  activeEstablishments: number;
  totalWorkers: number;
  activeWorkers: number;
  mappedWorkers: number;
  todayPresent: number;
  todayPartial: number;
  todayAbsent: number;
  attendanceRate: number;
}

export function useOverviewStats() {
  return useQuery({
    queryKey: ['overview-stats'],
    queryFn: async (): Promise<OverviewStats> => {
      const today = new Date().toISOString().split('T')[0];

      // Get department counts
      const { count: totalDepartments } = await supabase
        .from('departments')
        .select('*', { count: 'exact', head: true });

      const { count: activeDepartments } = await supabase
        .from('departments')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Get establishment counts
      const { count: totalEstablishments } = await supabase
        .from('establishments')
        .select('*', { count: 'exact', head: true });

      const { count: activeEstablishments } = await supabase
        .from('establishments')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Get worker counts
      const { count: totalWorkers } = await supabase
        .from('workers')
        .select('*', { count: 'exact', head: true });

      const { count: activeWorkers } = await supabase
        .from('workers')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Get mapped workers count
      const { count: mappedWorkers } = await supabase
        .from('worker_mappings')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Get today's attendance stats
      const { data: todayAttendance } = await supabase
        .from('attendance_daily_rollups')
        .select('status')
        .eq('attendance_date', today);

      let todayPresent = 0, todayPartial = 0;
      todayAttendance?.forEach(a => {
        if (a.status === 'PRESENT') todayPresent++;
        else if (a.status === 'PARTIAL') todayPartial++;
      });

      const todayAbsent = (mappedWorkers || 0) - todayPresent - todayPartial;
      const attendanceRate = mappedWorkers 
        ? Math.round(((todayPresent + todayPartial) / mappedWorkers) * 100) 
        : 0;

      return {
        totalDepartments: totalDepartments || 0,
        activeDepartments: activeDepartments || 0,
        totalEstablishments: totalEstablishments || 0,
        activeEstablishments: activeEstablishments || 0,
        totalWorkers: totalWorkers || 0,
        activeWorkers: activeWorkers || 0,
        mappedWorkers: mappedWorkers || 0,
        todayPresent,
        todayPartial,
        todayAbsent: Math.max(0, todayAbsent),
        attendanceRate,
      };
    },
    refetchInterval: 60000,
  });
}

interface RecentActivity {
  id: string;
  type: 'worker_registered' | 'establishment_registered' | 'worker_mapped' | 'attendance';
  description: string;
  timestamp: string;
}

export function useRecentActivity() {
  return useQuery({
    queryKey: ['recent-activity'],
    queryFn: async (): Promise<RecentActivity[]> => {
      const activities: RecentActivity[] = [];

      // Get recent workers
      const { data: recentWorkers } = await supabase
        .from('workers')
        .select('id, first_name, last_name, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      recentWorkers?.forEach(w => {
        activities.push({
          id: `worker-${w.id}`,
          type: 'worker_registered',
          description: `${w.first_name} ${w.last_name} registered`,
          timestamp: w.created_at,
        });
      });

      // Get recent establishments
      const { data: recentEstablishments } = await supabase
        .from('establishments')
        .select('id, name, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      recentEstablishments?.forEach(e => {
        activities.push({
          id: `est-${e.id}`,
          type: 'establishment_registered',
          description: `${e.name} establishment registered`,
          timestamp: e.created_at,
        });
      });

      // Get recent mappings
      const { data: recentMappings } = await supabase
        .from('worker_mappings')
        .select(`
          id,
          mapped_at,
          workers(first_name, last_name),
          establishments(name)
        `)
        .eq('is_active', true)
        .order('mapped_at', { ascending: false })
        .limit(5);

      recentMappings?.forEach((m: any) => {
        activities.push({
          id: `map-${m.id}`,
          type: 'worker_mapped',
          description: `${m.workers?.first_name} ${m.workers?.last_name} mapped to ${m.establishments?.name}`,
          timestamp: m.mapped_at,
        });
      });

      // Sort by timestamp and take most recent
      return activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10);
    },
    refetchInterval: 30000,
  });
}

interface AttendanceTrend {
  date: string;
  present: number;
  partial: number;
  absent: number;
  rate: number;
}

export function useAttendanceTrendOverview(days: number = 7) {
  return useQuery({
    queryKey: ['attendance-trend-overview', days],
    queryFn: async (): Promise<AttendanceTrend[]> => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split('T')[0];

      const { data: rollups } = await supabase
        .from('attendance_daily_rollups')
        .select('attendance_date, status')
        .gte('attendance_date', startDateStr)
        .order('attendance_date', { ascending: true });

      // Get total mapped workers for each day (simplified - using current count)
      const { count: totalMapped } = await supabase
        .from('worker_mappings')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Group by date
      const byDate: Record<string, { present: number; partial: number }> = {};
      rollups?.forEach(r => {
        if (!byDate[r.attendance_date]) {
          byDate[r.attendance_date] = { present: 0, partial: 0 };
        }
        if (r.status === 'PRESENT') byDate[r.attendance_date].present++;
        else if (r.status === 'PARTIAL') byDate[r.attendance_date].partial++;
      });

      // Generate trend data for each day
      const trends: AttendanceTrend[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayData = byDate[dateStr] || { present: 0, partial: 0 };
        const absent = (totalMapped || 0) - dayData.present - dayData.partial;
        const rate = totalMapped 
          ? Math.round(((dayData.present + dayData.partial) / totalMapped) * 100)
          : 0;

        trends.push({
          date: dateStr,
          present: dayData.present,
          partial: dayData.partial,
          absent: Math.max(0, absent),
          rate,
        });
      }

      return trends;
    },
  });
}
