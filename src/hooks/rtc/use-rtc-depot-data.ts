// src/hooks/rtc/use-rtc-depot-data.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type RTCTapRow = {
  id: string;
  occurred_at: string;
  event_type: string;
  worker_id: string;
  establishment_id: string | null;
  region: string;
  meta: any;
};

export function useRTCDepartmentCode(departmentId?: string) {
  return useQuery({
    queryKey: ["dept-code", departmentId],
    queryFn: async () => {
      if (!departmentId) return null;
      const { data, error } = await supabase
        .from("departments")
        .select("code, name")
        .eq("id", departmentId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!departmentId,
  });
}

export function useRTCEstablishment(establishmentId?: string) {
  return useQuery({
    queryKey: ["rtc-est", establishmentId],
    queryFn: async () => {
      if (!establishmentId) return null;
      const { data, error } = await supabase
        .from("establishments")
        .select("id, name, code, department_id, is_approved")
        .eq("id", establishmentId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!establishmentId,
  });
}

export function useRTCTapEvents(establishmentId?: string, limit = 50) {
  return useQuery({
    queryKey: ["rtc-taps", establishmentId, limit],
    queryFn: async () => {
      if (!establishmentId) return [];
      const { data, error } = await supabase
        .from("attendance_events")
        .select("id, occurred_at, event_type, worker_id, establishment_id, region, meta")
        .eq("establishment_id", establishmentId)
        .order("occurred_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []) as RTCTapRow[];
    },
    enabled: !!establishmentId,
    refetchInterval: 4000, // POC realtime-ish without changing backend
  });
}

export function useRTCPassengerSearch(rtcDepartmentId?: string, query?: string, limit = 10) {
  return useQuery({
    queryKey: ["rtc-passengers", rtcDepartmentId, query, limit],
    queryFn: async () => {
      if (!rtcDepartmentId) return [];
      const q = (query || "").trim();
      if (!q) return [];

      // POC search across name/phone/access_card_id/worker_id
      const { data, error } = await supabase
        .from("workers")
        .select("id, worker_id, first_name, last_name, phone, access_card_id, department_id")
        .eq("department_id", rtcDepartmentId)
        .or(
          [
            `first_name.ilike.%${q}%`,
            `last_name.ilike.%${q}%`,
            `phone.ilike.%${q}%`,
            `access_card_id.ilike.%${q}%`,
            `worker_id.ilike.%${q}%`,
          ].join(",")
        )
        .limit(limit);

      if (error) throw error;
      return data || [];
    },
    enabled: !!rtcDepartmentId && !!(query || "").trim(),
  });
}

export function useRTCPassengerTrips(establishmentId?: string, passengerWorkerUuid?: string, limit = 30) {
  return useQuery({
    queryKey: ["rtc-passenger-trips", establishmentId, passengerWorkerUuid, limit],
    queryFn: async () => {
      if (!establishmentId || !passengerWorkerUuid) return [];
      const { data, error } = await supabase
        .from("attendance_events")
        .select("id, occurred_at, event_type, worker_id, establishment_id, region, meta")
        .eq("establishment_id", establishmentId)
        .eq("worker_id", passengerWorkerUuid)
        .order("occurred_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data || [];
    },
    enabled: !!establishmentId && !!passengerWorkerUuid,
  });
}