import { useMemo, useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { NTR_BUSES, NTR_ROUTES } from "@/lib/rtc/ntrRoutes";
import { generateTicketNo } from "@/lib/rtc/ticket";


// Simple POC fare table (expand later)
const FARE_TABLE: Record<string, number> = {
  "NTR Bus Station|Gajuwaka": 10,
  "NTR Bus Station|Steel Plant": 20,
  "NTR Bus Station|Vizag RTC Complex": 30,

  "Gajuwaka|Steel Plant": 10,
  "Gajuwaka|Vizag RTC Complex": 15,

  "Steel Plant|Vizag RTC Complex": 10,
};

function getFare(from: string, to: string) {
  if (!from || !to || from === to) return 0;
  return FARE_TABLE[`${from}|${to}`] ?? 0; // fallback 0 if not defined
}



type WorkerRow = Tables<"workers">;
type MappingRow = Tables<"worker_mappings">;
type AttendanceEventRow = Tables<"attendance_events">;

function getDefaultDeviceId() {
  return localStorage.getItem("rtc_device_id") || "NTR-WEB-01";
}

function getDefaultReaderUid(source: "WEB_READER" | "MOBILE_NFC") {
  // you can later set these from config
  return source === "WEB_READER" ? "WEB-KIOSK-NTR-01" : "MOBILE-NFC-DEFAULT";
}

export default function RTCEstablishmentAttendance() {
  const { userContext } = useAuth();
  const establishmentId = userContext?.establishmentId;
  const cardInputRef = useRef<HTMLInputElement | null>(null);
  const [cardUid, setCardUid] = useState("");
  const [busNo, setBusNo] = useState(NTR_BUSES[0]?.busNo || "");
  const [fromStop, setFromStop] = useState("NTR Bus Station");
  const [toStop, setToStop] = useState("");
  const [loading, setLoading] = useState(false);
  const fare = useMemo(() => getFare(fromStop, toStop), [fromStop, toStop]);
  const bus = useMemo(() => NTR_BUSES.find((b) => b.busNo === busNo), [busNo]);
  const route = useMemo(() => NTR_ROUTES.find((r) => r.code === bus?.routeCode), [bus]);
  const stops = route?.stops.map((s) => s.name) || [];

  const depotCode = "NTR";
  useEffect(() => {
    cardInputRef.current?.focus();
  }, [])
  const canSubmit =
    !!establishmentId &&
    !!cardUid.trim() &&
    !!bus?.routeCode &&
    !!fromStop &&
    !!toStop &&
    fromStop !== toStop &&
    stops.includes(fromStop) &&
    stops.includes(toStop);

  async function handleTap(source: "WEB_READER" | "MOBILE_NFC") {
    if (!establishmentId) {
      toast.error("Missing establishmentId");
      return;
    }
    if (!canSubmit) {
      toast.error("Fill valid bus/route and From/To (must be on same route).");
      return;
    }

    setLoading(true);
    try {
      const trimmedCard = cardUid.trim();

      // 1) Find passenger by access_card_id (matches your generated schema)
      const { data: w, error: wErr } = await supabase
        .from("workers")
        .select("id, worker_id, first_name, last_name, access_card_id")
        .eq("access_card_id", trimmedCard)
        .maybeSingle<Pick<WorkerRow, "id" | "worker_id" | "first_name" | "last_name" | "access_card_id">>();

      if (wErr) throw wErr;
      if (!w) {
        toast.error("Card not linked to any passenger.");
        return;
      }

      // 2) Ensure mapped to this depot
      const { data: mapRow, error: mErr } = await supabase
        .from("worker_mappings")
        .select("id, is_active")
        .eq("establishment_id", establishmentId)
        .eq("worker_id", w.id)
        .maybeSingle<Pick<MappingRow, "id" | "is_active">>();

      if (mErr) throw mErr;
      if (!mapRow || mapRow.is_active === false) {
        toast.error("Passenger is not mapped (or inactive) for this depot.");
        return;
      }

      // 3) Determine CHECK_IN vs CHECK_OUT (toggle like welfare)
      const { data: lastEv, error: lastErr } = await supabase
        .from("attendance_events")
        .select("event_type, occurred_at")
        .eq("establishment_id", establishmentId)
        .eq("worker_id", w.id)
        .order("occurred_at", { ascending: false })
        .limit(1)
        .maybeSingle<Pick<AttendanceEventRow, "event_type" | "occurred_at">>();

      if (lastErr) throw lastErr;

      const nextEventType: "CHECK_IN" | "CHECK_OUT" =
        lastEv?.event_type === "CHECK_IN" ? "CHECK_OUT" : "CHECK_IN";

      // 4) Ticket no per tap (you requested)
      const ticketNo = generateTicketNo(depotCode);

      // 5) Insert attendance event (enum-safe)
      const payload: Partial<AttendanceEventRow> & {
        region: string;
        worker_id: string;
        event_type: "CHECK_IN" | "CHECK_OUT";
        establishment_id: string;
        meta: any;
      } = {
        occurred_at: new Date().toISOString(),
        event_type: nextEventType,
        worker_id: w.id,
        establishment_id: establishmentId,
        region: "RTC",
        meta: {
          timezone: "Asia/Kolkata",

          // card identifiers (schema uses access_card_id, keep card_uid in meta for readability)
          access_card_id: trimmedCard,
          card_uid: trimmedCard,

          // RTC fields
          bus_no: busNo,
          route_code: bus?.routeCode,
          from: fromStop,
          to: toStop,
          ticket_no: ticketNo,

          // device tracking
          tap_source: source,
          device_id: getDefaultDeviceId(),
          reader_uid: getDefaultReaderUid(source),

          // fare/outcome (POC)
          fare: 0,
          outcome: "ACCEPTED",
        },
      };

      const { error: insErr } = await supabase.from("attendance_events").insert(payload as any);
      if (insErr) throw insErr;

      toast.success("Tap recorded", {
        description: `${w.first_name} ${w.last_name} • ${nextEventType} • Ticket ${ticketNo}`,
      });

      setCardUid("");
      setToStop("");
    } catch (e: any) {
      toast.error("Tap failed", { description: e?.message || String(e) });
    } finally {
      setLoading(false);
    }
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Tap / Validate</CardTitle>
          <CardDescription>Record passenger tap events for RTC depot</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
         {/* Hidden card input for reader capture (keyboard wedge). NOT visible. */}
<input
  ref={cardInputRef}
  value={cardUid}
  onChange={(e) => setCardUid(e.target.value)}
  tabIndex={-1}
  autoFocus
  style={{
    position: "absolute",
    left: "-9999px",
    width: "1px",
    height: "1px",
    opacity: 0,
  }}
  aria-hidden="true"
/>

<div className="grid md:grid-cols-2 gap-4">
  <div>
    <div className="text-sm font-medium mb-2">Bus No</div>
    <select
      className="w-full border rounded-md h-10 px-3"
      value={busNo}
      onChange={(e) => {
        setBusNo(e.target.value);
        setFromStop("NTR Bus Station");
        setToStop("");
        // keep reader ready
        setTimeout(() => cardInputRef.current?.focus(), 0);
      }}
    >
      {NTR_BUSES.map((b) => (
        <option key={b.busNo} value={b.busNo}>
          {b.busNo} ({b.routeCode})
        </option>
      ))}
    </select>

    {bus?.routeCode ? (
      <div className="mt-2">
        <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-100">Route: {bus.routeCode}</Badge>
      </div>
    ) : null}
  </div>

  <div>
    <div className="text-sm font-medium mb-2">Fare</div>
    <div className="h-10 flex items-center px-3 border rounded-md bg-muted/30">
      ₹{fare}
    </div>
    <div className="text-xs text-muted-foreground mt-1">
      fare table (update later).
    </div>
  </div>
</div>

<div className="grid md:grid-cols-2 gap-4">
  <div>
    <div className="text-sm font-medium mb-2">From</div>
    <select
      className="w-full border rounded-md h-10 px-3"
      value={fromStop}
      onChange={(e) => {
        setFromStop(e.target.value);
        setToStop("");
        setTimeout(() => cardInputRef.current?.focus(), 0);
      }}
    >
      {stops.map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  </div>

  <div>
    <div className="text-sm font-medium mb-2">To</div>
    <select
      className="w-full border rounded-md h-10 px-3"
      value={toStop}
      onChange={(e) => {
        setToStop(e.target.value);
        setTimeout(() => cardInputRef.current?.focus(), 0);
      }}
    >
      <option value="">Select destination</option>
      {stops.filter((s) => s !== fromStop).map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  </div>
</div>

<div className="flex items-center justify-between gap-3">
  <div className="text-xs text-muted-foreground">
    Ready for card tap. (Reader will auto-fill in background)
  </div>

  <Button
    disabled={!canSubmit || loading}
    onClick={() => handleTap("WEB_READER")}
    className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white"
  >
    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
    Tap / Validate
  </Button>
</div>
        </CardContent>
      </Card>
    </div>
  );
}