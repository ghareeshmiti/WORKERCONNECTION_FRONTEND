import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, Landmark, Clock, ArrowRight, Eye, EyeOff, Loader2, CreditCard } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getDashboardPath } from "@/components/ProtectedRoute";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Banner Header */}
      {/* Top Banner Header - Reconstructed */}
      <header className="w-full border-b relative z-30">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img
            src="/src/assets/header_bg.png"
            alt="Header Background"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="container mx-auto px-4 flex items-center justify-between h-32 md:h-40 relative z-10">

          {/* Left: CM Image */}
          <div className="h-full flex items-end relative z-10">
            <img
              src="/src/assets/cm_babu.png"
              alt="Hon'ble Chief Minister"
              className="h-full w-auto object-contain"
            />
          </div>

          {/* Center: Logo & Text */}
          <div className="flex items-center gap-4 z-20">
            <img
              src="/src/assets/ap_logo.png"
              alt="AP Government Logo"
              className="h-20 md:h-28 w-auto object-contain"
            />

            <div className="flex flex-col items-start justify-center">
              <h1 className="text-2xl md:text-3xl font-display font-bold text-blue-900 leading-tight">
                One Person - One Card
              </h1>
              <div className="w-full h-px bg-slate-300 my-1"></div>
              <p className="text-sm md:text-lg text-slate-600 font-medium">
                Government of Andhra Pradesh
              </p>
            </div>
          </div>

          {/* Right: Map */}
          <div className="h-full flex items-center justify-end relative z-10">
            <img
              src="/src/assets/ap_map.png"
              alt="Andhra Pradesh Map"
              className="h-full w-auto object-contain opacity-90"
            />
          </div>

        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 bg-muted/30">
        <div className="w-full max-w-5xl bg-white rounded-2xl shadow-xl overflow-hidden grid md:grid-cols-2 min-h-[500px]">

          {/* Left Side: Branding */}
          <div className="p-8 flex flex-col items-center justify-center border-r bg-white/50 space-y-6">
            <img
              src="/src/assets/ap_logo.png"
              alt="Andhra Pradesh Government Seal"
              className="w-48 h-48 object-contain"
            />
            <div className="text-center space-y-2">
              <p className="text-xl text-slate-600 font-medium">Welcome to</p>
              <h1 className="text-4xl font-extrabold text-blue-900">One Person - One Card</h1>
            </div>
          </div>

          {/* Right Side: Login Form */}
          <div className="p-8 bg-slate-50 flex flex-col justify-center">
            <LoginSection />
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t bg-card text-card-foreground">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>© 2026 Government of Andhra Pradesh. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function LoginSection() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // State for form fields
  const [username, setUsername] = useState(""); // identifier
  const [password, setPassword] = useState("");

  // Worker/Citizen Auth State
  const [aadhaar, setAadhaar] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  // Admin/Department & Establishment Login
  const handleLogin = async (role: string) => {
    if (!username || !password) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // For Establishment, role is 'establishment'. For Admin, it's 'department' or 'admin'
      // The signIn function handles the auth, but we might need to verify the role if necessary
      const { error } = await signIn(username, password);

      if (error) {
        toast({ title: "Login Failed", description: error.message, variant: "destructive" });
        setLoading(false);
      } else {
        toast({ title: "Success", description: "Login successful!" });

        let targetPath = '/';
        if (role === 'department') targetPath = '/department/dashboard';
        else if (role === 'establishment') targetPath = '/establishment/dashboard';
        else targetPath = '/worker/dashboard';

        navigate(targetPath);
      }
    } catch (err) {
      toast({ title: "Error", description: "An unexpected error occurred", variant: "destructive" });
      setLoading(false);
    }
  };

  // Worker OTP Logic
  const handleWorkerSendOTP = async () => {
    const OTP_API_URL = (import.meta.env.VITE_API_URL || 'https://localhost:3000').replace(/\/$/, '');

    if (!/^\d{12}$/.test(aadhaar)) {
      toast({ title: "Error", description: "Please enter a valid 12-digit Aadhaar number", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${OTP_API_URL}/api/auth/worker-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aadhaar }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to send OTP");

      setOtpSent(true);
      toast({ title: "OTP Sent", description: data.message || "Verification code sent." });
    } catch (error: any) {
      console.error(error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleWorkerVerifyLogin = async () => {
    const OTP_API_URL = (import.meta.env.VITE_API_URL || 'https://localhost:3000').replace(/\/$/, '');

    if (otp.length !== 6) {
      toast({ title: "Error", description: "Enter 6-digit OTP", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${OTP_API_URL}/api/auth/worker-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aadhaar, otp }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Login failed");

      if (data.session) {
        const { error } = await supabase.auth.setSession(data.session);
        if (error) throw error;
      }

      toast({ title: "Success", description: "Login successful!" });
      navigate('/worker/dashboard');
    } catch (error: any) {
      console.error(error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSmartCardLogin = async () => {
    // If Aadhaar is entered, use it. Otherwise, try resident key (empty username).
    // The user requested "using the smart card and aadhaar number", so we prefer the value.
    const loginIdentifier = aadhaar || "";

    setLoading(true);
    try {
      const { authenticateUser } = await import("@/lib/api");
      const result = await authenticateUser(loginIdentifier, 'login');

      if (result.verified) {
        toast({ title: "Success", description: `Welcome back ${result.username}!` });

        // External Worker Login Call (As requested)
        try {
          const response = await fetch("https://workerconnection-backend.vercel.app/api/auth/worker-login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ aadhaar: result.username }),
          });
          const data = await response.json();
          if (data?.session) {
            await supabase.auth.setSession(data.session);
          }
        } catch (error) {
          console.error("External login error", error);
        }

        if (result.session) {
          const { error } = await supabase.auth.setSession(result.session);
          if (error) console.error("Failed to set session", error);
        }
        navigate('/worker/dashboard');
      }
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Login Failed",
        description: e.message || "Invalid Card or Read Error. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Tabs defaultValue="admin" className="w-full">
      <TabsList className="grid w-full grid-cols-3 mb-8 h-12 bg-transparent gap-4">
        <TabsTrigger value="admin" className="rounded-full border border-slate-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-600 data-[state=active]:text-white data-[state=active]:border-none h-10 transition-all">Admin</TabsTrigger>
        <TabsTrigger value="establishment" className="rounded-full border border-slate-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-600 data-[state=active]:text-white data-[state=active]:border-none h-10 transition-all">Establishment</TabsTrigger>
        <TabsTrigger value="citizen" className="rounded-full border border-slate-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-600 data-[state=active]:text-white data-[state=active]:border-none h-10 transition-all">Citizen</TabsTrigger>
      </TabsList>

      {/* Admin Login */}
      <TabsContent value="admin" className="space-y-4">
        <div className="space-y-2">
          <Label>Username</Label>
          <Input placeholder="Enter username" value={username} onChange={e => setUsername(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Password</Label>
          <div className="relative">
            <Input type={showPassword ? "text" : "password"} placeholder="Enter password" value={password} onChange={e => setPassword(e.target.value)} />
            <Button variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <div className="flex justify-end">
          <Button variant="link" className="px-0 text-orange-500">Forgot password</Button>
        </div>
        <Button className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white h-11 transition-all" onClick={() => handleLogin('department')} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "SIGN IN"}
        </Button>
      </TabsContent>

      {/* Establishment Login */}
      <TabsContent value="establishment" className="space-y-4">
        <div className="space-y-2">
          <Label>Username</Label>
          <Input placeholder="Enter username" value={username} onChange={e => setUsername(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Password</Label>
          <div className="relative">
            <Input type="password" placeholder="Enter password" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-between items-center">
          <Button variant="link" className="px-0 text-orange-500">Forgot password</Button>
        </div>

        <Button className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white h-11 transition-all" onClick={() => handleLogin('establishment')} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "SIGN IN"}
        </Button>

        <div className="relative w-full py-2">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-200"></span>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-slate-50 px-2 text-slate-500 font-medium">OR</span>
          </div>
        </div>

        <div className="w-full space-y-2">
          <Button variant="outline" className="w-full h-11 border-orange-500 text-orange-600 hover:bg-orange-50 font-bold" onClick={() => navigate('/register/establishment')}>
            REGISTER AS ESTABLISHMENT
          </Button>
          <p className="text-center text-xs text-slate-500">New to the platform?</p>
        </div>
      </TabsContent>

      {/* Citizen Login - Enhanced by User Request */}
      <TabsContent value="citizen" className="space-y-6">
        <div className="text-center space-y-1 mb-4">
          <h3 className="font-semibold text-lg">Citizen Login</h3>
          <p className="text-sm text-slate-500">Enter your Aadhaar to access your dashboard</p>
        </div>

        {/* Smart Card Login Button (Primary) */}
        <Button
          variant="outline"
          className="w-full h-12 text-base font-normal border-slate-300 hover:bg-slate-50 relative"
          onClick={handleSmartCardLogin}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="w-5 h-5 absolute left-4 animate-spin text-slate-600" />
          ) : (
            <div className="absolute left-4">
              <CreditCard className="w-5 h-5 text-slate-600" />
            </div>
          )}
          Login with Smart Card
        </Button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-200"></span>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-slate-50 px-2 text-slate-500 font-medium">Or login with</span>
          </div>
        </div>

        {!otpSent ? (
          <div className="space-y-2">
            <Label className="text-base font-medium">Aadhaar Number</Label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <CreditCard className="w-5 h-5" />
              </div>
              <Input
                placeholder="XXXX XXXX XXXX"
                value={aadhaar}
                onChange={e => setAadhaar(e.target.value.replace(/\D/g, "").slice(0, 12))}
                className="pl-10 h-11 text-lg tracking-widest bg-slate-50 border-slate-200"
                maxLength={12}
                disabled={loading}
              />
            </div>
            {aadhaar.length > 0 && (
              <Button className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white h-11 font-medium text-base transition-all mt-2" onClick={handleWorkerSendOTP} disabled={loading || aadhaar.length !== 12}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Send OTP"}
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-primary/10 p-3 rounded-md text-sm text-center border border-primary/20">
              <p className="text-primary font-medium">OTP sent to registered mobile.</p>
              <p className="text-xs text-muted-foreground mt-1">(Use any 6 digit number for Demo)</p>
            </div>

            <div className="space-y-2">
              <Label className="text-base font-medium">Enter OTP</Label>
              <Input
                className="text-center tracking-[1em] text-lg h-12 bg-slate-50 border-slate-200"
                placeholder="------"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                disabled={loading}
              />
            </div>

            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 font-medium text-base transition-all shadow-md" onClick={handleWorkerVerifyLogin} disabled={loading || otp.length !== 6}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Verify & Login"}
            </Button>

            <div className="text-center">
              <Button variant="link" className="w-full text-xs text-blue-600 hover:text-blue-800 underline-offset-4" onClick={() => setOtpSent(false)}>
                Change Aadhaar Number
              </Button>
            </div>
          </div>
        )}

        <div className="relative w-full py-2">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-200"></span>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-slate-50 px-2 text-slate-500 font-medium">OR</span>
          </div>
        </div>

        <div className="w-full space-y-2">
          <Button variant="outline" className="w-full h-11 border-orange-500 text-orange-600 hover:bg-orange-50 font-bold" onClick={() => navigate('/register/worker')}>
            REGISTER AS CITIZEN
          </Button>
          <p className="text-center text-xs text-slate-500">New to the platform?</p>
        </div>
      </TabsContent>

    </Tabs>
  );
}
