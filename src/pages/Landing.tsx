import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, Landmark, Clock, ArrowRight } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Clock className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-display font-bold">Worker Connect</span>
          </div>
          <Link to="/auth">
            <Button variant="outline">Sign In</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="p-4">
        <div className="container mx-auto text-center max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-6">Real-time Attendance Management</h1>
          <p className="text-lg text-muted-foreground mb-8">
            Streamline attendance tracking across departments and establishments with our secure, efficient platform.
          </p>

          {/* Quick Check-in Section */}
          <Card className="max-w-md mx-auto border-primary/20 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center justify-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Quick Check-In
              </CardTitle>
              <CardDescription>Enter your Worker ID to mark attendance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <input
                  id="worker-id-input"
                  type="text"
                  placeholder="Worker ID (e.g. WKR...)"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <Button onClick={async () => {
                  const input = document.getElementById('worker-id-input') as HTMLInputElement;
                  const username = input.value;
                  if (!username) {
                    alert("Please enter Worker ID");
                    return;
                  }
                  try {
                    const { authenticateUser } = await import("@/lib/api");
                    // @ts-ignore
                    const result = await authenticateUser(username, null, "Landing Page");

                    if (result && result.verified) {
                      alert(`Success! Marked ${result.newStatus || 'attendance'} for ${username}`);
                    } else {
                      alert("Verification failed");
                    }
                  } catch (e: any) {
                    console.error(e);
                    alert("Check-in failed: " + e.message);
                  }
                }}>
                  Check In
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Role Cards */}
      <section className="p-4 bg-muted/50">
        <div className="container mx-auto">
          <h2 className="text-2xl font-display font-bold text-center mb-12">Choose Your Role</h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Worker - Login only */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Worker</CardTitle>
                <CardDescription>Track your attendance, view history, and manage your profile</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link to="/auth?role=worker" className="block">
                  <Button className="w-full" variant="default">
                    Login
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Establishment */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                  <Building2 className="w-6 h-6 text-accent" />
                </div>
                <CardTitle>Establishment</CardTitle>
                <CardDescription>Manage workers, view attendance reports, and oversee operations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link to="/register/establishment" className="block">
                  <Button className="w-full bg-accent hover:bg-accent/90">Register</Button>
                </Link>
                <Link to="/auth?role=establishment" className="block">
                  <Button className="w-full" variant="outline">
                    Login
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Department */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center mb-4">
                  <Landmark className="w-6 h-6 text-success" />
                </div>
                <CardTitle>Department</CardTitle>
                <CardDescription>Oversee all establishments, analytics, and workforce management</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link to="/auth?role=department" className="block">
                  <Button className="w-full bg-success hover:bg-success/90">Login</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>Worker Connect © 2025.</p>
        </div>
      </footer>
    </div>
  );
}
