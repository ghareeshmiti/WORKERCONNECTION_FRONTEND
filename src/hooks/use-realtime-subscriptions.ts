import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

type TableName = 'attendance_events' | 'attendance_daily_rollups' | 'worker_mappings' | 'workers' | 'establishments' | 'departments';

interface UseRealtimeOptions {
  tables: TableName[];
  showToast?: boolean;
}

// Query key mappings for each table
const TABLE_QUERY_KEYS: Record<TableName, string[]> = {
  attendance_events: [
    'worker-today-attendance',
    'worker-attendance-history',
    'establishment-today-attendance',
    'department-stats',
    'overview-stats',
    'recent-activity',
  ],
  attendance_daily_rollups: [
    'worker-today-attendance',
    'worker-attendance-history',
    'worker-monthly-stats',
    'worker-attendance-trend',
    'establishment-today-attendance',
    'establishment-attendance-trend',
    'establishment-attendance-trend-range',
    'department-stats',
    'department-attendance-trend',
    'department-attendance-trend-range',
    'overview-stats',
    'attendance-trend-overview',
  ],
  worker_mappings: [
    'establishment-workers',
    'unmapped-workers',
    'department-workers',
    'department-stats',
    'overview-stats',
    'recent-activity',
  ],
  workers: [
    'worker-profile',
    'establishment-workers',
    'unmapped-workers',
    'department-workers',
    'overview-stats',
    'recent-activity',
  ],
  establishments: [
    'department-establishments',
    'department-stats',
    'overview-stats',
    'recent-activity',
  ],
  departments: [
    'overview-stats',
  ],
};

// Human-readable table names for toast
const TABLE_LABELS: Record<TableName, string> = {
  attendance_events: 'Attendance',
  attendance_daily_rollups: 'Attendance',
  worker_mappings: 'Worker mapping',
  workers: 'Worker',
  establishments: 'Establishment',
  departments: 'Department',
};

export function useRealtimeSubscriptions({ tables, showToast = true }: UseRealtimeOptions) {
  const queryClient = useQueryClient();
  const lastToastTime = useRef<number>(0);
  const toastDebounceMs = 3000; // Debounce toasts to avoid spam

  const showUpdateToast = useCallback((table: TableName) => {
    if (!showToast) return;
    
    const now = Date.now();
    if (now - lastToastTime.current < toastDebounceMs) return;
    
    lastToastTime.current = now;
    
    toast({
      title: "Data updated",
      description: `${TABLE_LABELS[table]} data refreshed`,
      duration: 2000,
    });
  }, [showToast]);

  useEffect(() => {
    const channels = tables.map((table) => {
      const channel = supabase
        .channel(`realtime-${table}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: table,
          },
          () => {
            // Invalidate all related queries
            const queryKeys = TABLE_QUERY_KEYS[table] || [];
            queryKeys.forEach((key) => {
              queryClient.invalidateQueries({ queryKey: [key] });
            });
            
            // Show toast notification
            showUpdateToast(table);
          }
        )
        .subscribe();

      return channel;
    });

    return () => {
      channels.forEach((channel) => {
        supabase.removeChannel(channel);
      });
    };
  }, [queryClient, tables, showUpdateToast]);
}

// Convenience hooks for specific dashboard types
export function useWorkerDashboardRealtime() {
  useRealtimeSubscriptions({
    tables: ['attendance_events', 'attendance_daily_rollups', 'worker_mappings'],
  });
}

export function useEstablishmentDashboardRealtime() {
  useRealtimeSubscriptions({
    tables: ['attendance_events', 'attendance_daily_rollups', 'worker_mappings', 'workers'],
  });
}

export function useDepartmentDashboardRealtime() {
  useRealtimeSubscriptions({
    tables: ['attendance_events', 'attendance_daily_rollups', 'worker_mappings', 'workers', 'establishments'],
  });
}

export function useOverviewDashboardRealtime() {
  useRealtimeSubscriptions({
    tables: ['attendance_events', 'attendance_daily_rollups', 'worker_mappings', 'workers', 'establishments', 'departments'],
  });
}
