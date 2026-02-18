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

      // Fetch from tickets table
      const { data, error } = await (supabase
        .from("tickets" as any)
        .select("*, workers(first_name, last_name)") // Fetch valid columns
        .eq("establishment_id", establishmentId)
        .order("issued_at", { ascending: false })
        .limit(limit));

      if (error) throw error;

      // Map to RTCTapRow format for compatibility
      const tickets = (data || []) as any[];
      return tickets.map(t => ({
        id: String(t.id), // Ensure string for UI keys
        occurred_at: t.issued_at,
        event_type: "TICKET_ISSUED",
        worker_id: t.worker_id,
        establishment_id: t.establishment_id,
        region: "Andhra Pradesh",
        meta: {
          bus_no: t.bus_number,
          route: t.route_name || t.route_id, // Use route_name if available
          from: t.from_stop,
          to: t.to_stop,
          fare: t.fare,
          govt_subsidy: t.govt_subsidy_amount, // Added subsidy
          remarks: t.remarks, // Added remarks
          worker_name: t.workers ? `${t.workers.first_name || ''} ${t.workers.last_name || ''}`.trim() : "Unknown", // Construct name
          is_free: t.is_free,
          outcome: "Accepted", // Tickets are always successful if in DB
          ticket_no: t.ticket_id || String(t.id), // Use ticket_id column if available
          scheme: t.is_free ? (t.remarks || "Govt Scheme") : "Standard"
        }
      })) as RTCTapRow[];
    },
    enabled: !!establishmentId,
    refetchInterval: 4000,
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

      const { data, error } = await (supabase
        .from("tickets" as any)
        .select("*")
        .eq("establishment_id", establishmentId)
        .eq("worker_id", passengerWorkerUuid)
        .order("issued_at", { ascending: false })
        .limit(limit));

      if (error) throw error;

      return (data || []).map((t: any) => ({
        id: t.id,
        occurred_at: t.issued_at,
        event_type: "TICKET_ISSUED",
        worker_id: t.worker_id,
        establishment_id: t.establishment_id,
        region: "Andhra Pradesh",
        meta: {
          bus_no: t.bus_number,
          route: t.route_id,
          from: t.from_stop,
          to: t.to_stop,
          fare: t.fare,
          outcome: "Accepted",
          ticket_no: t.id.slice(0, 8).toUpperCase()
        }
      })) as RTCTapRow[];
    },
    enabled: !!establishmentId && !!passengerWorkerUuid,
  });
}