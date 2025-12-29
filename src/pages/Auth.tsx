import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "@/lib/auth-context";
import { getDashboardPath } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Clock, Loader2, ArrowLeft, Eye, EyeOff, Mail, Phone, KeyRound } from "lucide-react";

// Password validation regex
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

type AuthMode = "login" | "forgot" | "reset";

export default function Auth() {
  const [searchParams] = useSearchParams();
  const role = searchParams.get("role") || "worker";
  const isWorker = role === "worker";

  const [mode, setMode] = useState<AuthMode>("login");
  const [identifier, setIdentifier] = useState(""); // email or mobile
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { signIn, userContext, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [redirecting, setRedirecting] = useState(false);

  // Effect to redirect after successful login when userContext is loaded
  useEffect(() => {
    if (redirecting && userContext && !authLoading) {
      const dashboardPath = getDashboardPath(userContext.role);
      navigate(dashboardPath, { replace: true });
    }
  }, [redirecting, userContext, authLoading, navigate]);

  const getRoleTitle = () => {
    switch (role) {
      case "worker":
        return "Worker";
      case "establishment":
        return "Establishment";
      case "department":
        return "Department";
      default:
        return "User";
    }
  };

  const validateIdentifier = (): boolean => {
    setErrors({});
    if (isWorker) {
      // Validate mobile number for worker
      if (!/^[6-9]\d{9}$/.test(identifier)) {
        setErrors({ identifier: "Please enter a valid 10-digit mobile number" });
        return false;
      }
    } else {
      // Validate email for department/establishment
      const emailSchema = z.string().email("Please enter a valid email address");
      try {
        emailSchema.parse(identifier);
      } catch {
        setErrors({ identifier: "Please enter a valid email address" });
        return false;
      }
    }
    return true;
  };

  const validatePasswords = (): boolean => {
    setErrors({});
    if (!passwordRegex.test(newPassword)) {
      setErrors({
        newPassword: "Password must have min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character",
      });
      return false;
    }
    if (newPassword !== confirmPassword) {
      setErrors({ confirmPassword: "Passwords don't match" });
      return false;
    }
    return true;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!identifier || !password) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }

    // For worker login via mobile, we need to construct an email-like identifier
    // In a real app, the backend would handle mobile-based auth
    const loginIdentifier = isWorker ? `${identifier}@worker.local` : identifier;

    setLoading(true);
    try {
      const { error } = await signIn(loginIdentifier, password);

      if (error) {
        toast({ title: "Login Failed", description: error.message, variant: "destructive" });
        setLoading(false);
      } else {
        toast({ title: "Success", description: "Login successful!" });
        // Set redirecting flag - the useEffect will handle navigation once userContext is ready
        setRedirecting(true);
      }
    } catch (err) {
      toast({ title: "Error", description: "An unexpected error occurred", variant: "destructive" });
      setLoading(false);
    }
  };

  const handleSendOTP = async () => {
    if (!validateIdentifier()) return;

    setLoading(true);
    // Simulate OTP sending
    setTimeout(() => {
      setOtpSent(true);
      setLoading(false);
      toast({
        title: "OTP Sent",
        description: isWorker
          ? "A verification OTP has been sent to your mobile (simulated)."
          : "A verification OTP has been sent to your email (simulated).",
      });
    }, 1000);
  };

  const handleVerifyOTP = () => {
    // Accept any 4-digit OTP for POC
    if (otp.length === 4 && /^\d{4}$/.test(otp)) {
      setOtpVerified(true);
      setMode("reset");
      toast({ title: "Verified!", description: "OTP verification successful. Please set a new password." });
    } else {
      setErrors({ otp: "Please enter a valid 4-digit OTP" });
    }
  };

  const handleResetPassword = async () => {
    if (!validatePasswords()) return;

    setLoading(true);
    // Simulate password reset
    setTimeout(() => {
      setLoading(false);
      toast({ title: "Password Reset", description: "Your password has been reset successfully. Please login." });
      // Reset all states and go back to login
      setMode("login");
      setIdentifier("");
      setPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setOtpSent(false);
      setOtp("");
      setOtpVerified(false);
    }, 1500);
  };

  const handleBackToLogin = () => {
    setMode("login");
    setOtpSent(false);
    setOtp("");
    setOtpVerified(false);
    setErrors({});
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center">
              <Clock className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-2xl font-display font-bold">Worker Connect</h1>
          <p className="text-muted-foreground">
            {mode === "login" && "Sign in to continue"}
            {mode === "forgot" && "Reset your password"}
            {mode === "reset" && "Set new password"}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {mode === "login" && `${getRoleTitle()} Login`}
              {mode === "forgot" && "Forgot Password"}
              {mode === "reset" && "Reset Password"}
            </CardTitle>
            <CardDescription>
              {mode === "login" && "Enter your credentials to access your dashboard"}
              {mode === "forgot" &&
                (isWorker
                  ? "Enter your registered mobile number to reset password"
                  : "Enter your registered email to reset password")}
              {mode === "reset" && "Enter your new password"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Login Mode */}
            {mode === "login" && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="identifier">{isWorker ? "Mobile Number" : "Email"}</Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {isWorker ? <Phone className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                    </div>
                    <Input
                      id="identifier"
                      type={isWorker ? "tel" : "email"}
                      placeholder={isWorker ? "9876543210" : "you@example.com"}
                      value={identifier}
                      onChange={(e) =>
                        setIdentifier(isWorker ? e.target.value.replace(/\D/g, "").slice(0, 10) : e.target.value)
                      }
                      disabled={loading}
                      className="pl-10"
                      maxLength={isWorker ? 10 : undefined}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="button" variant="link" className="px-0 text-sm" onClick={() => setMode("forgot")}>
                    Forgot Password?
                  </Button>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Sign In
                </Button>
              </form>
            )}

            {/* Forgot Password Mode */}
            {mode === "forgot" && !otpVerified && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgotIdentifier">{isWorker ? "Registered Mobile Number" : "Registered Email"}</Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {isWorker ? <Phone className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                    </div>
                    <Input
                      id="forgotIdentifier"
                      type={isWorker ? "tel" : "email"}
                      placeholder={isWorker ? "9876543210" : "you@example.com"}
                      value={identifier}
                      onChange={(e) => {
                        setIdentifier(isWorker ? e.target.value.replace(/\D/g, "").slice(0, 10) : e.target.value);
                        setErrors({});
                      }}
                      disabled={loading || otpSent}
                      className={`pl-10 ${otpSent ? "bg-muted" : ""}`}
                      maxLength={isWorker ? 10 : undefined}
                    />
                  </div>
                  {errors.identifier && <p className="text-sm text-destructive">{errors.identifier}</p>}
                </div>

                {!otpSent ? (
                  <Button onClick={handleSendOTP} disabled={loading || !identifier} className="w-full">
                    {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Send OTP
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="otp">Enter OTP</Label>
                      <div className="flex gap-2">
                        <Input
                          id="otp"
                          type="text"
                          placeholder="Enter 4-digit OTP"
                          value={otp}
                          onChange={(e) => {
                            setOtp(e.target.value.replace(/\D/g, "").slice(0, 4));
                            setErrors({});
                          }}
                          maxLength={4}
                          className="flex-1"
                        />
                        <Button onClick={handleVerifyOTP} disabled={otp.length !== 4}>
                          Verify
                        </Button>
                      </div>
                      {errors.otp && <p className="text-sm text-destructive">{errors.otp}</p>}
                      <p className="text-xs text-muted-foreground">For POC: Enter any 4-digit number</p>
                    </div>

                    <Button variant="link" className="w-full" onClick={handleSendOTP} disabled={loading}>
                      Resend OTP
                    </Button>
                  </div>
                )}

                <Button variant="outline" className="w-full" onClick={handleBackToLogin}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Login
                </Button>
              </div>
            )}

            {/* Reset Password Mode */}
            {mode === "reset" && (
              <div className="space-y-4">
                <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3 flex items-center gap-2 text-sm">
                  <KeyRound className="w-4 h-4 text-green-600" />
                  <span className="text-green-800 dark:text-green-200">Identity verified. Set your new password.</span>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Min 8 chars, 1 upper, 1 lower, 1 number, 1 special"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setErrors({});
                      }}
                      disabled={loading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {errors.newPassword && <p className="text-sm text-destructive">{errors.newPassword}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setErrors({});
                      }}
                      disabled={loading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
                </div>

                <Button onClick={handleResetPassword} className="w-full" disabled={loading}>
                  {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Reset Password
                </Button>

                <Button variant="outline" className="w-full" onClick={handleBackToLogin}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Login
                </Button>
              </div>
            )}

            {mode === "login" && (
              <div className="mt-6 text-center text-sm">
                <p className="text-muted-foreground">
                  {(role === "establishment" || role === "department") && <span> Don't have an account? </span>}
                  {role === "establishment" && (
                    <Link to="/register/establishment" className="text-primary hover:underline">
                      Register as Establishment
                    </Link>
                  )}
                  {role === "department" && (
                    <Link to="/register/department" className="text-primary hover:underline">
                      Register as Department
                    </Link>
                  )}
                  {!role && (
                    <Link to="/register/worker" className="text-primary hover:underline">
                      Register
                    </Link>
                  )}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
