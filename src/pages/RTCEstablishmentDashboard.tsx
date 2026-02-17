import { useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, LogOut, Bus, ArrowRightLeft } from "lucide-react";
import { format } from "date-fns";

import { useRTCEstablishment, useRTCTapEvents } from "@/hooks/rtc/use-rtc-depot-data";

function money(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}
function pct(n: number) {
  return `${Math.round(n * 10) / 10}%`;
}

export default function RTCEstablishmentDashboard() {
  const { userContext, signOut } = useAuth();
  const navigate = useNavigate();

  const establishmentId = userContext?.establishmentId;
  const { data: est, isLoading: estLoading } = useRTCEstablishment(establishmentId);
  const { data: taps, isLoading: tapsLoading } = useRTCTapEvents(establishmentId, 50);

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const stats = useMemo(() => {
    const rows = taps || [];
    const today = new Date().toDateString();

    let totalToday = 0;
    let accepted = 0;
    let declined = 0;
    let freeRides = 0;
    let revenue = 0;

    for (const r of rows) {
      const d = new Date(r.occurred_at);
      if (d.toDateString() !== today) continue;

      totalToday++;

      const outcome = (r.meta?.outcome || r.meta?.status || r.event_type || "").toString().toLowerCase();
      const isAccepted = outcome.includes("accept") || outcome.includes("success") || outcome.includes("checkin") || outcome.includes("tap_in");
      const isDeclined = outcome.includes("declin") || outcome.includes("fail") || outcome.includes("reject");

      const fare = Number(r.meta?.fare ?? r.meta?.amount ?? 0) || 0;
      const scheme = (r.meta?.scheme || r.meta?.reason || "").toString().toLowerCase();

      if (isAccepted) accepted++;
      if (isDeclined) declined++;

      if (fare === 0 && (scheme.includes("stree") || scheme.includes("women") || scheme.includes("shakti"))) freeRides++;
      if (fare > 0) revenue += fare;
    }

    const acceptedRate = totalToday > 0 ? (accepted / totalToday) * 100 : 0;

    return { totalToday, acceptedRate, freeRides, revenue, declined, offlineBacklog: 0 };
  }, [taps]);

  const entitlements = [
    { name: "Women Free Rides", desc: "Stree Shakti • Limited services", status: "Active" },
    { name: "Paid Rides", desc: "Standard fare • All services", status: "Active" },
  ];

  const title = est?.name || userContext?.fullName || "RTC Depot";

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b sticky top-0 z-20">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/opoc/ap-logo.png" alt="Seal" className="w-10 h-10 object-contain" />
            <div className="flex flex-col">
              <span className="text-lg md:text-xl font-display font-bold bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent leading-none">
                One State - One Card
              </span>
              <span className="text-xs text-slate-500 font-medium tracking-wide">Government of Andhra Pradesh</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end mr-2">
              <span className="text-sm font-medium text-slate-700">{title}</span>
              <span className="text-xs text-slate-500">RTC Depot Dashboard</span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-slate-500 hover:text-red-500 hover:bg-red-50">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-2xl font-display font-bold">Depot Dashboard</h1>

          {/* ✅ reuse existing attendance flow, but we will route RTC to passenger wording */}
          <Button className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white" asChild>
            <Link to="/establishment/attendance">
              <ArrowRightLeft className="w-4 h-4 mr-2" />
              Tap / Validate
            </Link>
          </Button>
        </div>

        <div className="grid md:grid-cols-6 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total taps today</CardTitle>
              <Bus className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {tapsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <div className="text-2xl font-bold">{stats.totalToday}</div>}
              <p className="text-xs text-muted-foreground">Tap validations</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Accepted rate</CardTitle>
              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Live</Badge>
            </CardHeader>
            <CardContent>
              {tapsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <div className="text-2xl font-bold">{pct(stats.acceptedRate)}</div>}
              <p className="text-xs text-muted-foreground">Successful validations</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Women free rides</CardTitle>
              <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Stree Shakti</Badge>
            </CardHeader>
            <CardContent>
              {tapsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <div className="text-2xl font-bold">{stats.freeRides}</div>}
              <p className="text-xs text-muted-foreground">Consumed today</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Paid revenue</CardTitle>
              <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-100">INR</Badge>
            </CardHeader>
            <CardContent>
              {tapsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <div className="text-2xl font-bold">{money(stats.revenue)}</div>}
              <p className="text-xs text-muted-foreground">From paid rides</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Declines</CardTitle>
              <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Alerts</Badge>
            </CardHeader>
            <CardContent>
              {tapsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <div className="text-2xl font-bold">{stats.declined}</div>}
              <p className="text-xs text-muted-foreground">Failed validations</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Offline backlog</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.offlineBacklog}</div>
              <p className="text-xs text-muted-foreground">Pending sync</p>
            </CardContent>
          </Card>
        </div>

        {/* ✅ keep entitlements (purple in screenshot) */}
        <Card>
          <CardHeader>
            <CardTitle>Entitlement programs</CardTitle>
            <CardDescription>Programs active for RTC travel cards</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {entitlements.map((p) => (
              <div key={p.name} className="flex items-center justify-between border rounded-lg p-3">
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.desc}</div>
                </div>
                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">{p.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* ✅ tap stream (NO reason/mode; bus no/route before timestamp) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5" />
              Tap event stream
            </CardTitle>
            <CardDescription>Decisioning via Central Fare Engine</CardDescription>
          </CardHeader>
          <CardContent>
            {tapsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : !taps || taps.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">No tap events yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 font-medium">Bus No/Route</th>
                      <th className="text-left py-3 font-medium">Timestamp</th>
                      <th className="text-left py-3 font-medium">Ticket</th>
                      <th className="text-left py-3 font-medium">From → To</th>
                      <th className="text-left py-3 font-medium">Outcome</th>
                      <th className="text-left py-3 font-medium">Fare</th>
                    </tr>
                  </thead>
                  <tbody>
                    {taps.map((r: any) => {
                      const bus = r.meta?.bus_no ? `${r.meta.bus_no}${r.meta?.route_code ? ` (${r.meta.route_code})` : ""}` : (r.meta?.route || "—");
                      const ts = format(new Date(r.occurred_at), "HH:mm:ss");
                      const ticket = r.meta?.ticket_no || "—";
                      const from = r.meta?.from || "—";
                      const to = r.meta?.to || "—";
                      const outcomeRaw = (r.meta?.outcome || r.meta?.status || r.event_type || "").toString().toLowerCase();
                      const outcome = outcomeRaw.includes("declin") || outcomeRaw.includes("fail") ? "Declined" : "Accepted";
                      const fare = Number(r.meta?.fare ?? r.meta?.amount ?? 0) || 0;

                      return (
                        <tr key={r.id} className="border-b border-muted hover:bg-muted/30 transition-colors">
                          <td className="py-3 font-mono text-xs">{bus}</td>
                          <td className="py-3">{ts}</td>
                          <td className="py-3 font-mono text-xs">{ticket}</td>
                          <td>{from} → {to}</td>
                          <td className="py-3">
                            <Badge className={outcome === "Accepted" ? "bg-green-100 text-green-800 hover:bg-green-100" : "bg-red-100 text-red-800 hover:bg-red-100"}>
                              {outcome}
                            </Badge>
                          </td>
                          <td className="py-3">{fare === 0 ? "FREE" : money(fare)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}