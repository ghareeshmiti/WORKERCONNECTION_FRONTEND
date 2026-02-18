import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { authenticateUser, saveTicket } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, LogOut, CreditCard, Printer, CheckCircle2, Bus, MapPin, Ticket } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

// Mock Data for Routes/Stations
const STATIONS = ["Guntur", "Vijayawada", "Tenali", "Mangalagiri", "Amaravati"];

type TicketState = "IDLE" | "SCANNING" | "VERIFIED" | "ISSUING" | "ISSUED";

interface PassengerDetails {
    id: string;
    name: string;
    age: number;
    gender: "Male" | "Female" | "Other";
    cardId: string;
    isEligibleFree: boolean;
    schemeName?: string;
    photoUrl?: string; // Placeholder
}

// Mock users removed - fetching from DB now

export default function ConductorDashboard() {
    const { userContext, signOut } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [state, setState] = useState<TicketState>("IDLE");
    const [passenger, setPassenger] = useState<PassengerDetails | null>(null);
    const [source, setSource] = useState("Guntur");
    const [destination, setDestination] = useState("");
    const [fare, setFare] = useState(0);
    const [ticketId, setTicketId] = useState("");

    const handleLogout = async () => {
        await signOut();
        navigate("/auth?role=employee");
    };

    const handleScan = async () => {
        setState("SCANNING");
        try {
            // Perform actual smart card authentication (Usernameless flow)
            // We use 'verification' action to distinguish from login
            const result = await authenticateUser("", 'verification');

            if (result.verified && result.username) {
                // Fetch real worker details from Supabase using the returned username (worker_id)
                // Cast to any to avoid strict type checks if local types are outdated
                const { data: worker, error } = await supabase
                    .from('workers')
                    .select('id, worker_id, first_name, last_name, date_of_birth, gender, photo_url, district, mandal')
                    .eq('worker_id', result.username)
                    .maybeSingle();

                if (error) {
                    console.error("Worker fetch error:", error);
                    throw new Error("Could not fetch worker details.");
                }

                if (!worker) {
                    toast({ title: "Worker Not Found", description: "Card verified but worker profile missing.", variant: "destructive" });
                    setState("IDLE");
                    return;
                }

                const w = worker as any;

                // Calculate Age
                let age = 0;
                if (w.date_of_birth) {
                    const dob = new Date(w.date_of_birth);
                    const diff = Date.now() - dob.getTime();
                    age = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
                }

                // Map to PassengerDetails
                const pDetails: PassengerDetails = {
                    id: w.id, // UUID
                    name: `${w.first_name} ${w.last_name}`,
                    age: age,
                    gender: (w.gender as any) || "Other",
                    cardId: w.worker_id,
                    // Mock eligibility logic for now (e.g. Females are free in some schemes)
                    isEligibleFree: (w.gender === 'Female' || age > 60),
                    schemeName: (w.gender === 'Female') ? "Mahila Shakti" : (age > 60 ? "Senior Citizen" : undefined),
                    photoUrl: w.photo_url
                };

                setPassenger(pDetails);
                setState("VERIFIED");
                setDestination(""); // Reset destination
                toast({ title: "Card Verified", description: "Passenger details retrieved successfully." });

            } else {
                setState("IDLE");
                toast({ title: "Verification Failed", description: "Card could not be verified.", variant: "destructive" });
            }
        } catch (error: any) {
            console.error("Smart Card Scan Error:", error);
            setState("IDLE");

            // Handle specific NotAllowedError (User Cancelled or Timed Out)
            if (error.name === 'NotAllowedError') {
                toast({
                    title: "Scan Cancelled or Timed Out",
                    description: "Please tap your card when prompted. Do not cancel the dialog.",
                    variant: "destructive"
                });
            } else {
                toast({
                    title: "Scan Error",
                    description: error.message || "Failed to read smart card. Please try again.",
                    variant: "destructive"
                });
            }
        }
    };

    // Calculate fare based on destination (Mock logic)
    useEffect(() => {
        if (source && destination) {
            // Mock fare calculation
            if (passenger?.isEligibleFree) {
                setFare(0);
            } else {
                setFare(45); // Static for demo
            }
        }
    }, [source, destination, passenger]);

    const handleIssueTicket = async () => {
        if (!destination) {
            toast({ title: "Error", description: "Select destination", variant: "destructive" });
            return;
        }

        console.log("DEBUG: userContext:", userContext);
        console.log("DEBUG: passenger:", passenger);

        setState("ISSUING");

        const newTicketId = `T${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

        try {
            // Save to database
            // Save to database
            await saveTicket({
                ticketId: newTicketId,
                passengerName: passenger?.name || 'Unknown',
                source,
                destination,
                fare: passenger?.isEligibleFree ? 0 : fare,
                issuedBy: userContext?.fullName || 'Conductor',
                paymentMode: passenger?.isEligibleFree ? 'FREE' : 'CASH',
                busNumber: 'AP07-1234',

                // New Fields
                workerId: passenger?.id || null,
                establishmentId: userContext?.establishmentId || null,
                conductorId: userContext?.authUserId || null,
                routeId: 'R-101', // Mock Route ID
                routeName: 'Guntur - Vijayawada Express',
                fromStop: source,
                toStop: destination,
                isFree: passenger?.isEligibleFree || false,
                govtSubsidyAmount: passenger?.isEligibleFree ? fare : 0,
                remarks: passenger?.schemeName || 'Standard Ticket'
            });

            // Simulate slight delay for printing/processing effect
            setTimeout(() => {
                setTicketId(newTicketId);
                setState("ISSUED");
                toast({ title: "Success", description: "Ticket Issued Successfully" });
            }, 1000);
        } catch (error) {
            console.error("Failed to save ticket", error);
            toast({ title: "Error", description: "Could not save ticket. Please try again.", variant: "destructive" });
            setState("VERIFIED");
        }
    };

    const handleNextPassenger = () => {
        setPassenger(null);
        setDestination("");
        setFare(0);
        setTicketId("");
        setState("IDLE");
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background to-muted flex flex-col">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md border-b border-border/40 sticky top-0 z-50">
                <div className="container mx-auto py-3 px-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <img src="/opoc/ap-logo.png" alt="AP Govt" className="w-10 h-10 object-contain drop-shadow-sm" />
                        <div className="flex flex-col">
                            <h1 className="font-display font-bold text-lg tracking-tight leading-none bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">APSRTC</h1>
                            <span className="text-[10px] text-muted-foreground tracking-wide font-medium">Government of Andhra Pradesh</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs md:text-sm">
                        <div className="hidden md:block text-right">
                            <div className="text-muted-foreground">Conductor: <span className="text-foreground font-semibold">{userContext?.fullName || "Ravi Kumar"}</span></div>
                            <div className="text-muted-foreground">Bus: <span className="text-orange-600 font-bold">AP07-1234</span></div>
                        </div>
                        <div className="text-right">
                            <div className="text-muted-foreground">POS ID: <span className="text-foreground font-semibold">POS-001</span></div>
                            <div className="text-muted-foreground">Route: <span className="text-foreground">Guntur → Vijayawada</span></div>
                        </div>
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-red-600 hover:bg-red-50" onClick={handleLogout}>
                            <LogOut className="w-5 h-5" />
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 container mx-auto p-4 flex items-center justify-center">
                <Card className="w-full max-w-md shadow-lg border-0 overflow-hidden">

                    {/* IDLE / SCANNING STATE */}
                    {(state === "IDLE" || state === "SCANNING") && (
                        <CardContent className="pt-10 pb-10 flex flex-col items-center text-center space-y-6">
                            <div className="w-20 h-20 bg-orange-100 rounded-2xl flex items-center justify-center mb-2 animate-pulse">
                                <CreditCard className="w-10 h-10 text-orange-600" />
                            </div>

                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold text-slate-900">Insert Smart Card</h2>
                                <p className="text-slate-500 max-w-xs mx-auto">Please insert the citizen's smart card into the reader</p>
                            </div>

                            <div className="py-8 w-full flex justify-center">
                                <div className="w-32 h-20 border-2 border-dashed border-orange-200 rounded-lg flex items-center justify-center bg-orange-50/50">
                                    <CreditCard className="w-8 h-8 text-orange-300" />
                                </div>
                            </div>

                            <Button
                                size="lg"
                                className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-md shadow-orange-500/20"
                                onClick={handleScan}
                                disabled={state === "SCANNING"}
                            >
                                {state === "SCANNING" ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Scanning...
                                    </>
                                ) : (
                                    "Scan Smart Card"
                                )}
                            </Button>
                        </CardContent>
                    )}

                    {/* VERIFIED STATE */}
                    {(state === "VERIFIED" || state === "ISSUING") && passenger && (
                        <CardContent className="p-0">
                            <div className="p-5 border-b bg-white">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="bg-green-100 p-1 rounded-full">
                                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                                    </div>
                                    <span className="font-semibold text-slate-900">Verification Successful</span>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 border border-slate-200">
                                        {passenger.photoUrl ? (
                                            <img
                                                src={passenger.photoUrl}
                                                alt={passenger.name}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    // Fallback to emoji if image fails
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                    (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class="text-2xl">👤</span>';
                                                }}
                                            />
                                        ) : (
                                            <span className="text-2xl">👤</span>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-900">{passenger.name}</h3>
                                        <p className="text-sm text-slate-500">Card: {passenger.cardId}</p>
                                        <div className="flex gap-2 mt-1">
                                            <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full text-slate-600 font-medium">{passenger.age} yrs</span>
                                            <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full text-slate-600 font-medium">{passenger.gender}</span>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-1">Vijayawada, Krishna</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-5 bg-slate-50/50 space-y-6">
                                {/* Eligibility Banner */}
                                {passenger.isEligibleFree ? (
                                    <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-center">
                                        <span className="block text-green-700 font-bold text-sm bg-green-600 text-white px-3 py-1 rounded-full inline-block mb-1">Eligible for Free Scheme</span>
                                        <p className="text-green-800 text-sm font-medium">{passenger.schemeName || "Govt Scheme"}</p>
                                    </div>
                                ) : (
                                    <div className="bg-slate-100 border border-slate-200 rounded-lg p-3 text-center">
                                        <span className="font-semibold text-slate-700 text-sm">Not Eligible for Free Scheme</span>
                                        <p className="text-slate-500 text-xs">Paid ticket only</p>
                                    </div>
                                )}

                                {/* Route Selection */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-slate-600 uppercase flex items-center gap-1">
                                            <MapPin className="w-3 h-3" /> From
                                        </Label>
                                        <Select value={source} onValueChange={setSource}>
                                            <SelectTrigger className="bg-white">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {STATIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-slate-600 uppercase flex items-center gap-1">
                                            <MapPin className="w-3 h-3" /> To
                                        </Label>
                                        <Select value={destination} onValueChange={setDestination}>
                                            <SelectTrigger className="bg-white">
                                                <SelectValue placeholder="Select destination" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {STATIONS.filter(s => s !== source).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Fare Display (Only for Paid) */}
                                {!passenger.isEligibleFree && fare > 0 && (
                                    <div className="text-center py-2">
                                        <div className="text-2xl font-bold text-slate-900">₹{fare}</div>
                                    </div>
                                )}

                                <Button
                                    size="lg"
                                    className={`w-full ${passenger.isEligibleFree ? 'bg-slate-700 hover:bg-slate-800' : 'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 shadow-md shadow-orange-500/20'} text-white font-semibold`}
                                    onClick={handleIssueTicket}
                                    disabled={state === "ISSUING" || !destination}
                                >
                                    {state === "ISSUING" ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Issuing...
                                        </>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            <Ticket className="w-4 h-4" />
                                            {passenger.isEligibleFree ? "Issue Free Ticket" : "Issue Paid Ticket"}
                                        </span>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    )}

                    {/* ISSUED STATE */}
                    {state === "ISSUED" && passenger && (
                        <CardContent className="p-6 text-center space-y-6">
                            <div className="flex justify-center">
                                <div className="bg-green-100 p-3 rounded-full">
                                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                                </div>
                            </div>
                            <h2 className="text-xl font-bold text-slate-900">Ticket Issued Successfully</h2>

                            {/* Receipt */}
                            <div className="bg-white border rounded-lg p-0 overflow-hidden shadow-sm text-left">
                                <div className="bg-slate-50 p-3 border-b text-center font-bold text-sm text-slate-700 uppercase tracking-widest">
                                    APSRTC - Bus Ticket
                                </div>
                                <div className="p-4 space-y-4">
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                        <div>
                                            <span className="block text-xs text-slate-500 font-semibold">Ticket:</span>
                                            <span className="font-mono font-bold text-slate-900">{ticketId}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="block text-xs text-slate-500 font-semibold">Bus:</span>
                                            <span className="font-medium text-slate-900">AP07-1234</span>
                                        </div>
                                        <div>
                                            <span className="block text-xs text-slate-500 font-semibold">Route:</span>
                                            <span className="font-medium text-slate-900">{source} → {destination}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="block text-xs text-slate-500 font-semibold">Date:</span>
                                            <span className="font-medium text-slate-900">{format(new Date(), 'dd/MM/yyyy')}</span>
                                        </div>
                                    </div>

                                    <div className="border-t pt-3 flex justify-between items-center">
                                        <span className="font-bold text-lg">{source}</span>
                                        <span className="text-slate-400">→</span>
                                        <span className="font-bold text-lg">{destination}</span>
                                    </div>

                                    <div className="border-t pt-4 text-center">
                                        {passenger.isEligibleFree ? (
                                            <div className="inline-block">
                                                <span className="block text-2xl font-bold text-green-600">FREE</span>
                                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold uppercase rounded-full tracking-wider">Govt Scheme</span>
                                            </div>
                                        ) : (
                                            <div className="inline-block">
                                                <span className="block text-2xl font-bold text-slate-900">₹{fare}</span>
                                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase rounded-full tracking-wider">Paid</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="text-center text-[10px] text-slate-400 pt-2">
                                        {format(new Date(), 'dd/MM/yyyy, HH:mm:ss')}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <Button variant="outline" className="flex-1 gap-2 border-slate-300" onClick={handlePrint}>
                                    <Printer className="w-4 h-4" /> Print
                                </Button>
                                <Button className="flex-1 gap-2 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white shadow-md shadow-blue-500/20" onClick={handleNextPassenger}>
                                    Next Passenger
                                </Button>
                            </div>

                        </CardContent>
                    )}

                </Card>
            </main>
        </div>
    );
}
