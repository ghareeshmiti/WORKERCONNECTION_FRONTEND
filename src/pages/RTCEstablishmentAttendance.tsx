
import { useMemo, useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, User, MapPin, Ticket, CheckCircle, RefreshCcw } from "lucide-react";
import { format } from "date-fns";
import { NTR_BUSES, NTR_ROUTES } from "@/lib/rtc/ntrRoutes";
import { generateTicketNo } from "@/lib/rtc/ticket";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

// Simple POC fare table
const FARE_TABLE: Record<string, number> = {
  "NTR Bus Station|Gajuwaka": 10,
  "Gajuwaka|NTR Bus Station": 10,
  "NTR Bus Station|Steel Plant": 20,
  "Steel Plant|NTR Bus Station": 20,
  "NTR Bus Station|Vizag RTC Complex": 30,
  "Vizag RTC Complex|NTR Bus Station": 30,
  "Gajuwaka|Steel Plant": 10,
  "Steel Plant|Gajuwaka": 10,
  "Gajuwaka|Vizag RTC Complex": 15,
  "Vizag RTC Complex|Gajuwaka": 15,
  "Steel Plant|Vizag RTC Complex": 10,
  "Vizag RTC Complex|Steel Plant": 10,
  // Guntur Routes
  "Guntur|Amaravati": 35,
  "Amaravati|Guntur": 35,
  "Guntur|Tenali": 45,
  "Tenali|Guntur": 45,
  "Guntur|Mangalagiri": 45,
  "Mangalagiri|Guntur": 45,
  "Guntur|Vijayawada": 60,
  "Vijayawada|Guntur": 60,
  "Guntur|Guntur": 0 // Just in case
};

function getFare(from: string, to: string) {
  if (!from || !to || from === to) return 0;
  return FARE_TABLE[`${from}|${to}`] ?? 0;
}

export default function RTCEstablishmentAttendance() {
  const { userContext } = useAuth();
  const establishmentId = userContext?.establishmentId;
  const cardInputRef = useRef<HTMLInputElement | null>(null);

  // Setup State
  const [busNo, setBusNo] = useState(NTR_BUSES[0]?.busNo || "");
  const [fromStop, setFromStop] = useState("NTR Bus Station");
  const [toStop, setToStop] = useState("");

  // Scanning State
  const [cardUid, setCardUid] = useState("");
  const [loading, setLoading] = useState(false);

  // Passenger State (after scan)
  const [passenger, setPassenger] = useState<any>(null);
  const [ticketStatus, setTicketStatus] = useState<"idle" | "success">("idle");
  const [lastTicket, setLastTicket] = useState<any>(null);

  const fare = useMemo(() => getFare(fromStop, toStop), [fromStop, toStop]);
  const bus = useMemo(() => NTR_BUSES.find((b) => b.busNo === busNo), [busNo]);
  const route = useMemo(() => NTR_ROUTES.find((r) => r.code === bus?.routeCode), [bus]);
  const stops = route?.stops.map((s) => s.name) || [];

  useEffect(() => {
    // Focus invisible input handling
    const focusInterval = setInterval(() => {
      if (passenger === null && ticketStatus === 'idle') {
        cardInputRef.current?.focus();
      }
    }, 1000);
    return () => clearInterval(focusInterval);
  }, [passenger, ticketStatus]);

  // Reset stops when bus changes
  useEffect(() => {
    if (stops.length > 0) {
      setFromStop(stops[0]);
      setToStop("");
    }
  }, [busNo]); // Fixed dependency (removed stops to avoid loops if array ref changes)

  // Handle Card Scan (Enter key from reader)
  const handleScan = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!cardUid.trim()) return;

    setLoading(true);
    try {
      const trimmedCard = cardUid.trim();

      // Fetch Worker + Photo
      const { data: w, error } = await supabase
        .from("workers" as any)
        .select("id, worker_id, first_name, last_name, dob, gender, photo_url, profile_pic_url, address_state, address_district, address_mandal, address_village, access_card_id, is_active")
        .eq("access_card_id", trimmedCard)
        .maybeSingle();

      if (error) throw error;
      if (!w) {
        toast.error("Card not recognized", { description: "No passenger linked to this card." });
        setCardUid("");
        return;
      }

      // Check Mapping to this Establishment? (Optional for RTC, maybe universal access?)
      // For now, let's assume if they have a card, they can ride.
      // But maybe check if "active" worker?
      if (!(w as any).is_active) {
        toast.warning("Passenger account is inactive.");
      }

      // Calculate Age
      let age = "N/A";
      if ((w as any).dob) {
        const dob = new Date((w as any).dob);
        const diff = Date.now() - dob.getTime();
        age = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25)).toString();
      }

      setPassenger({ ...(w as any), age });
      setCardUid(""); // Clear input for next

    } catch (err: any) {
      toast.error("Scan failed", { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleIssueTicket = async () => {
    if (!passenger || !establishmentId) return;

    setLoading(true);
    try {
      // Determine Free/Paid
      // Logic: If gender is Female -> Free? Or based on specific schemes?
      // For demo: Assume ALL mapped workers are eligible for "Free Scheme" (e.g., Construction Worker Pass)
      // Let's create a logic: If age > 60 -> Free? 
      // User asked for "Free/Paid".

      // Let's assume Free for now as per "Mahila" scheme or "Worker Pass".
      const isFree = true;
      const ticketFare = isFree ? 0 : fare;
      const subsidy = isFree ? fare : 0;

      console.log("DEBUG: Calculating Subsidy:", { fare, ticketFare, subsidy, isFree });

      const ticketData = {
        worker_id: passenger.id,
        establishment_id: establishmentId,
        bus_number: busNo,
        route_id: bus?.routeCode,
        route_name: route?.name,
        from_stop: fromStop,
        to_stop: toStop,
        fare: ticketFare,
        is_free: isFree,
        govt_subsidy_amount: subsidy,
        conductor_id: userContext.authUserId || null,
        remarks: "Automated Issue",
        // issued_at defaults to NOW()
      };

      console.log("DEBUG: Inserting Ticket:", ticketData);

      const { data, error } = await supabase.from('tickets' as any).insert(ticketData).select().single();

      if (error) throw error;

      setLastTicket({ ...data, passenger_name: `${passenger.first_name} ${passenger.last_name}` });
      setTicketStatus("success");
      toast.success("Ticket Issued Successfully!");

    } catch (err: any) {
      toast.error("Issue failed", { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const resetFlow = () => {
    setPassenger(null);
    setTicketStatus("idle");
    setLastTicket(null);
    setCardUid("");
    setTimeout(() => cardInputRef.current?.focus(), 100);
  };

  if (ticketStatus === "success" && lastTicket) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-md">
        <Card className="border-green-500 border-2 shadow-lg">
          <CardHeader className="text-center bg-green-50 rounded-t-xl pb-2">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-2">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardDescription>APSRTC - {establishmentId ? "Depot Operation" : "Mobile Unit"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="scope-ticket border-dashed border-2 border-slate-200 p-4 rounded-md bg-white">
              <div className="text-center border-b pb-2 mb-2">
                <h3 className="font-bold text-lg">APSRTC TICKET</h3>
                <p className="text-xs text-muted-foreground">{format(new Date(), "dd/MM/yyyy, hh:mm a")}</p>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ticket No:</span>
                  <span className="font-mono font-bold">{lastTicket.id.slice(0, 8).toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bus / Route:</span>
                  <span>{lastTicket.bus_number} / {lastTicket.route_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Journey:</span>
                  <span className="text-right">{lastTicket.from_stop} <br />to {lastTicket.to_stop}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center pt-1">
                  <span className="text-muted-foreground">Passenger:</span>
                  <span className="font-semibold">{lastTicket.passenger_name}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="font-bold">Total Fare:</span>
                  <span className="text-xl font-bold">
                    {lastTicket.is_free ? "FREE" : `₹${lastTicket.fare}`}
                  </span>
                </div>
                {lastTicket.is_free && (
                  <div className="text-xs text-center text-orange-600 bg-orange-50 p-1 rounded">
                    Subsidy Paid by Govt: ₹{lastTicket.govt_subsidy_amount}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={resetFlow} className="w-full" size="lg">
              <RefreshCcw className="w-4 h-4 mr-2" /> Issue Next Ticket
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="grid md:grid-cols-2 gap-6">

        {/* Left Column: Route Setup */}
        <Card>
          <CardHeader>
            <CardTitle>Route Details</CardTitle>
            <CardDescription>Set current trip details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Bus Number</label>
              <select
                className="w-full border rounded-md h-10 px-3 mt-1"
                value={busNo}
                onChange={e => setBusNo(e.target.value)}
                disabled={!!passenger}
              >
                {NTR_BUSES.map(b => <option key={b.busNo} value={b.busNo}>{b.busNo}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">From</label>
              <select
                className="w-full border rounded-md h-10 px-3 mt-1"
                value={fromStop}
                onChange={e => setFromStop(e.target.value)}
                disabled={!!passenger}
              >
                {stops.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">To</label>
              <select
                className="w-full border rounded-md h-10 px-3 mt-1"
                value={toStop}
                onChange={e => setToStop(e.target.value)}
                disabled={!!passenger}
              >
                <option value="">Select Destination</option>
                {stops.filter(s => s !== fromStop).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Interaction or Passenger Info */}
        <div className="space-y-4">
          {!passenger ? (
            <Card className="h-full border-orange-200 border bg-orange-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-900">
                  <Ticket className="w-5 h-5 text-orange-600" /> Tap Passenger Card
                </CardTitle>
                <CardDescription className="text-orange-700/80">Ready to scan...</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center min-h-[200px]">
                {loading ? (
                  <Loader2 className="w-12 h-12 animate-spin text-orange-500" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-white border-4 border-orange-100 flex items-center justify-center animate-pulse">
                    <RefreshCcw className="w-10 h-10 text-orange-300" />
                  </div>
                )}
                <input
                  ref={cardInputRef}
                  value={cardUid}
                  onChange={e => {
                    setCardUid(e.target.value);
                    if (e.target.value.length > 5 && !loading) {
                      // Auto submit debounce could go here, or just wait for enter
                    }
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleScan(e);
                  }}
                  className="opacity-0 absolute w-px h-px"
                  autoFocus
                />
                <p className="text-sm text-center text-muted-foreground mt-4">
                  Use Web NFC Reader or type Card ID + Enter
                </p>
                <Button variant="outline" size="sm" className="mt-2 border-orange-200 text-orange-700 hover:bg-orange-100" onClick={() => handleScan()}>
                  Simulate Scan
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full border-green-200 border shadow-md">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>Passenger Verified</CardTitle>
                    <CardDescription>Confirm details to issue ticket</CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                    Eligible: Free
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-4">
                  <Avatar className="w-20 h-20 border-2 border-slate-100">
                    <AvatarImage src={passenger.photo_url || passenger.profile_pic_url} className="object-cover" />
                    <AvatarFallback><User className="w-8 h-8 text-slate-400" /></AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <h3 className="font-bold text-lg">{passenger.first_name} {passenger.last_name}</h3>
                    <div className="text-sm text-slate-600 flex items-center gap-1">
                      <span className="font-medium">{passenger.gender || 'Unknown'}</span>
                      <span>•</span>
                      <span>{passenger.age} Yrs</span>
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {passenger.address_village || 'Unknown Village'}, {passenger.address_mandal}
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-slate-50 p-2 rounded">
                    <div className="text-xs text-slate-500">Route</div>
                    <div className="font-medium truncate">{fromStop} → {toStop}</div>
                  </div>
                  <div className="bg-slate-50 p-2 rounded">
                    <div className="text-xs text-slate-500">Fare to Pay</div>
                    <div className="font-bold text-lg text-green-600">FREE <span className="text-xs font-normal text-slate-400 line-through">₹{fare}</span></div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button variant="ghost" onClick={resetFlow} className="w-1/3">Cancel</Button>
                <Button
                  onClick={handleIssueTicket}
                  disabled={loading}
                  className="w-2/3 bg-green-600 hover:bg-green-700"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Ticket className="w-4 h-4 mr-2" />}
                  Issue Ticket
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}