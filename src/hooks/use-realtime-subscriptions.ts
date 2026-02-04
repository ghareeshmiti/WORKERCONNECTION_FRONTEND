import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

// Toast configuration by table type
const TABLE_TOAST_CONFIG: Record<TableName, { 
  title: string; 
  description: string;
  icon: string;
}> = {
  attendance_events: {
    title: '✓ Attendance Updated',
    description: 'New attendance event recorded',
    icon: '🕐',
  },
  attendance_daily_rollups: {
    title: '✓ Attendance Synced',
    description: 'Daily attendance data refreshed',
    icon: '📊',
  },
  worker_mappings: {
    title: '✓ Mapping Changed',
    description: 'Worker assignment updated',
    icon: '🔗',
  },
  workers: {
    title: '✓ Worker Updated',
    description: 'Worker information changed',
    icon: '👷',
  },
  establishments: {
    title: '✓ Establishment Updated',
    description: 'Establishment data refreshed',
    icon: '🏢',
  },
  departments: {
    title: '✓ Department Updated',
    description: 'Department information changed',
    icon: '🏛️',
  },
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
    
    const config = TABLE_TOAST_CONFIG[table];
    
    toast.success(config.title, {
      description: config.description,
      icon: config.icon,
      duration: 2500,
      position: 'bottom-right',
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
