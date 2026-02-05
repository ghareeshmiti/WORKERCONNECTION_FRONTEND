// import { Link } from "react-router-dom";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Users, Building2, Landmark, Clock, ArrowRight } from "lucide-react";

// export default function Landing() {
//   return (
//     <div className="min-h-screen bg-background">
//       {/* Header */}
//       <header className="border-b bg-card">
//         <div className="container mx-auto px-4 py-4 flex items-center justify-between">
//           <div className="flex items-center gap-2">
//             <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
//               <Clock className="w-6 h-6 text-primary-foreground" />
//             </div>
//             <span className="text-xl font-display font-bold">One Person One Card</span>
//           </div>
//         </div>
//       </header>

//       {/* Hero */}
//       <section className="p-4">
//         <div className="container mx-auto text-center max-w-3xl">
//           <h1 className="text-4xl md:text-5xl font-display font-bold mb-6">Real-time Attendance Management</h1>
//           <p className="text-lg text-muted-foreground mb-0">
//             Streamline attendance tracking across departments and establishments with our secure, efficient platform.
//           </p>
//         </div>
//       </section>

//       {/* Role Cards */}
//       <section className="p-4 bg-muted/50">
//         <div className="container mx-auto">
//           <h2 className="text-2xl font-display font-bold text-center mb-4">Choose Your Role</h2>
//           <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
//             {/* Worker - Login only */}
//             <Card className="hover:shadow-lg transition-shadow">
//               <CardHeader>
//                 <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
//                   <Users className="w-6 h-6 text-primary" />
//                 </div>
//                 <CardTitle>Worker</CardTitle>
//                 <CardDescription>Track your attendance, view history, and manage your profile</CardDescription>
//               </CardHeader>
//               <CardContent className="space-y-3">
//                 <Link to="/register/worker" className="block">
//                   <Button className="w-full" variant="default">Register</Button>
//                 </Link>
//                 <Link to="/auth?role=worker" className="block">
//                   <Button variant="outline"
//                     className="w-full border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600"
//                   >
//                     Login
//                   </Button>
//                 </Link>
//               </CardContent>
//             </Card>

//             {/* Establishment */}
//             <Card className="hover:shadow-lg transition-shadow">
//               <CardHeader>
//                 <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
//                   <Building2 className="w-6 h-6 text-accent" />
//                 </div>
//                 <CardTitle>Establishment</CardTitle>
//                 <CardDescription>Manage workers, view attendance reports, and oversee operations</CardDescription>
//               </CardHeader>
//               <CardContent className="space-y-3">
//                 <Link to="/register/establishment" className="block">
//                   <Button className="w-full bg-accent hover:bg-accent/90">Register</Button>
//                 </Link>
//                 <Link to="/auth?role=establishment" className="block">
//                   <Button className="w-full" variant="outline">
//                     Login
//                   </Button>
//                 </Link>
//               </CardContent>
//             </Card>

//             {/* Department */}
//             <Card className="hover:shadow-lg transition-shadow">
//               <CardHeader>
//                 <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center mb-4">
//                   <Landmark className="w-6 h-6 text-success" />
//                 </div>
//                 <CardTitle>Department</CardTitle>
//                 <CardDescription>Oversee all establishments, analytics, and workforce management</CardDescription>
//               </CardHeader>
//               <CardContent className="space-y-3">
//                 <Link to="/auth?role=department" className="block">
//                   <Button className="w-full bg-success hover:bg-success/90">Login</Button>
//                 </Link>
//               </CardContent>
//             </Card>
//           </div>
//         </div>
//       </section>

//       {/* Footer */}
//       <footer className="py-8 px-4 border-t">
//         <div className="container mx-auto text-center text-sm text-muted-foreground">
//           <p>One Person One Card © 2026.</p>
//         </div>
//       </footer>
//     </div>
//   );
// }

import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Users,
  Building2,
  Landmark,
  ShieldCheck,
  BadgeCheck,
  IdCard,
  FileText,
} from "lucide-react";

export default function Landing() {
  const [logoOk, setLogoOk] = useState(true);
  const [cmOk, setCmOk] = useState(true);
  return (
    <div className="min-h-screen bg-background">
      {/* Header Blue Band */}
      <header className="bg-[#ffcb05] text-[hsl(222 47% 11%)]">
        {/* <header className="text-primary-foreground bg-[linear-gradient(90deg,#FF7700_0%,#FF7700_50%,#ffcb05_50%,#ffcb05_100%)]"> */}
        {/* <header className="text-primary-foreground bg-[linear-gradient(to_right,#FF7700_0%,rgba(255,119,0,0)_50%),linear-gradient(to_left,#ffcb05_0%,rgba(255,203,5,0)_50%)]"> */}
        {/* <header
          className="text-primary-foreground"
          style={{
            backgroundColor: "#ffb200",
            backgroundImage:
              "linear-gradient(to right,#FF7700 0%,rgba(255,119,0,0) 55%),linear-gradient(to left,#ffcb05 0%,rgba(255,203,5,0) 55%)",
          }}
        > */}
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Left: Logo + Titles */}
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-white border border-primary-foreground/25 overflow-hidden shrink-0 flex items-center justify-center">
                {logoOk ? (
                  <img
                    src="/opoc/ap-logo.png"
                    alt="Government of Andhra Pradesh emblem"
                    className="h-full w-full object-contain p-0.5"
                    onError={() => setLogoOk(false)}
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-xs font-semibold text-primary">
                    AP
                  </div>
                )}
              </div>

              <div className="leading-tight">
                <div className="text-xs sm:text-sm opacity-90">
                  Government of Andhra Pradesh
                </div>
                <div className="text-xl sm:text-2xl font-display font-bold">
                  One State - One Card
                </div>
                <div className="text-xs sm:text-sm opacity-90">
                  Official Identity &amp; Access Portal
                </div>
              </div>
            </div>

            {/* Right: Helpdesk */}
            <div className="text-xs sm:text-sm sm:text-right opacity-95 space-y-1">
              <div className="whitespace-nowrap">
                Helpdesk Phone: 1800-XXXX-XXXX
              </div>
              <div className="whitespace-nowrap">
                Helpdesk Email: support-opoc@ap.gov.in
              </div>
            </div>
          </div>
        </div>
      </header>

      <main id="main">
        {/* Hero */}
        <section className="py-8 sm:py-10 bg-muted/10">
          <div className="container mx-auto px-4">
            <div
              className="grid gap-8 lg:grid-cols-12 lg:items-start"
              style={{ justifyContent: "center", alignItems: "center" }}
            >
              {/* Left hero content */}
              <div className="lg:col-span-6">
                <h1 className="text-3xl sm:text-5xl font-display font-bold text-foreground leading-tight">
                  One State - One Card for Identity and Access
                </h1>

                <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl">
                  A unified government system to issue and manage a single
                  official identity card for each individual, enabling secure
                  verification and access across establishments and departments.
                </p>
              </div>

              {/* Right: CM Card - larger image + necessary content only */}
              <div className="lg:col-span-6">
                <Card className="border-2 border-primary/35 shadow-sm overflow-hidden">
                  <CardContent className="p-0">
                    <div className="border-b bg-muted/30 px-5 py-3">
                      <div className="text-sm font-semibold text-foreground">
                        Hon&apos;ble Chief Minister, Andhra Pradesh
                      </div>
                    </div>

                    <div className="p-5">
                      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                        {/* Bigger portrait box (noticeably larger) */}
                        <div className="h-52 w-44 sm:h-60 sm:w-48 rounded-lg overflow-hidden border bg-white flex items-center justify-center shrink-0">
                          {cmOk ? (
                            <img
                              src="/opoc/cm.jpg"
                              alt="Nara Chandrababu Naidu"
                              className="h-full w-full object-cover"
                              onError={() => setCmOk(false)}
                            />
                          ) : (
                            <div className="text-xs text-muted-foreground px-2 text-center">
                              CM photo missing
                            </div>
                          )}
                        </div>

                        <div className="text-center sm:text-left">
                          <div className="text-lg sm:text-xl font-semibold text-foreground">
                            Nara Chandrababu Naidu
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Chief Minister, Government of Andhra Pradesh
                          </div>

                          <div className="mt-3 text-sm text-foreground leading-relaxed">
                            Strengthening transparency, security, and efficient
                            governance through a unified identity system for
                            every individual.
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Role Access Section (single source of truth for actions) */}
        {/* <section id="helpdesk" className="py-10 bg-muted/20">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="text-sm text-muted-foreground">
                Role Access Section
              </div>
              <h2 className="text-2xl sm:text-3xl font-display font-bold">
                Select Your Role for Access
              </h2>

              <div className="mt-6 grid gap-5 md:grid-cols-3">
              
                <Card className="border-2 border-primary/45 shadow-sm">
                  <CardContent className="p-5">
                    <div className="rounded-md bg-muted/40 px-3 py-2 text-center font-semibold">
                      Worker Access
                    </div>

                    <div className="mt-4 flex items-center justify-center gap-3">
                      <Users className="h-5 w-5 text-primary" />
                      <span className="text-sm text-muted-foreground">
                        Login / Register
                      </span>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <Link to="/auth?role=worker" className="block">
                        <Button className="w-full bg-[#FF7700] hover:bg-[#FF7700]/90">
                          Login
                        </Button>
                      </Link>
                      <Link to="/register/worker" className="block">
                        <Button className="w-full bg-[#FF7700] hover:bg-[#FF7700]/90">
                          Register
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>

    
                <Card className="border-2 border-primary/45 shadow-sm">
                  <CardContent className="p-5">
                    <div className="rounded-md bg-muted/40 px-3 py-2 text-center font-semibold">
                      Establishment Access
                    </div>

                    <div className="mt-4 flex items-center justify-center gap-3">
                      <Building2 className="h-5 w-5 text-primary" />
                      <span className="text-sm text-muted-foreground">
                        Login / Register
                      </span>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <Link to="/auth?role=establishment" className="block">
                        <Button className="w-full bg-[#FF7700] hover:bg-[#FF7700]/90">
                          Login
                        </Button>
                      </Link>
                      <Link to="/register/establishment" className="block">
                        <Button className="w-full bg-[#FF7700] hover:bg-[#FF7700]/90">
                          Register
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>

    
                <Card className="border-2 border-primary/45 shadow-sm">
                  <CardContent className="p-5">
                    <div className="rounded-md bg-muted/40 px-3 py-2 text-center font-semibold">
                      Department Access
                    </div>

                    <div className="mt-4 flex items-center justify-center gap-3">
                      <Landmark className="h-5 w-5 text-primary" />
                      <span className="text-sm text-muted-foreground">
                        Login
                      </span>
                    </div>

                    <div className="mt-5">
                      <Link to="/auth?role=department" className="block">
                        <Button className="w-full bg-[#FF7700] hover:bg-[#FF7700]/90">
                          Login
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section> */}

        {/* Role Access Section (single source of truth for actions) */}
        <section id="helpdesk" className="py-10 bg-muted/20">
          <div className="container mx-auto px-4">
            {/* Remove max-w-5xl + mx-auto because you want a left block + right image */}
            <div
              className="grid gap-8 lg:grid-cols-12 lg:items-start"
              style={{ justifyContent: "center", alignItems: "center" }}
            >
              {/* LEFT SIDE */}
              <div className="lg:col-span-7">
                <div className="text-sm text-muted-foreground text-left">
                  Role Access Section
                </div>

                <h2 className="text-2xl sm:text-3xl font-display font-bold text-left">
                  Select Your Role for Access
                </h2>

                <div className="mt-6 grid gap-5 md:grid-cols-3">
                  {/* Worker Access */}
                  <Card className="border-2 border-primary/45 shadow-sm">
                    <CardContent className="p-5">
                      {/* Left align heading */}
                      <div className="rounded-md bg-muted/40 px-3 py-2 text-left font-semibold">
                        Worker Access
                      </div>

                      {/* Left align icon row */}
                      <div className="mt-4 flex items-center justify-start gap-3">
                        <Users className="h-5 w-5 text-primary" />
                        <span className="text-sm text-muted-foreground">
                          Login / Register
                        </span>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <Link to="/auth?role=worker" className="block">
                          <Button className="w-full bg-[#FF7700] hover:bg-[#FF7700]/90">
                            Login
                          </Button>
                        </Link>
                        <Link to="/register/worker" className="block">
                          <Button className="w-full bg-[#FF7700] hover:bg-[#FF7700]/90">
                            Register
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Establishment Access */}
                  <Card className="border-2 border-primary/45 shadow-sm">
                    <CardContent className="p-5">
                      <div className="rounded-md bg-muted/40 px-3 py-2 text-left font-semibold">
                        Establishment Access
                      </div>

                      <div className="mt-4 flex items-center justify-start gap-3">
                        <Building2 className="h-5 w-5 text-primary" />
                        <span className="text-sm text-muted-foreground">
                          Login / Register
                        </span>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <Link to="/auth?role=establishment" className="block">
                          <Button className="w-full bg-[#FF7700] hover:bg-[#FF7700]/90">
                            Login
                          </Button>
                        </Link>
                        <Link to="/register/establishment" className="block">
                          <Button className="w-full bg-[#FF7700] hover:bg-[#FF7700]/90">
                            Register
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Department Access */}
                  <Card className="border-2 border-primary/45 shadow-sm">
                    <CardContent className="p-5">
                      <div className="rounded-md bg-muted/40 px-3 py-2 text-left font-semibold">
                        Department Access
                      </div>

                      <div className="mt-4 flex items-center justify-start gap-3">
                        <Landmark className="h-5 w-5 text-primary" />
                        <span className="text-sm text-muted-foreground">
                          Login
                        </span>
                      </div>

                      <div className="mt-5">
                        <Link to="/auth?role=department" className="block">
                          <Button className="w-full bg-[#FF7700] hover:bg-[#FF7700]/90">
                            Login
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* RIGHT SIDE IMAGE */}
              <div className="lg:col-span-5">
                <Card className="border-2 border-primary/35 shadow-sm overflow-hidden">
                  <CardContent className="p-0">
                    <div className="border-b bg-muted/30 px-5 py-3">
                      <div className="text-sm font-semibold text-foreground">
                        Universal Benefit Card
                      </div>
                    </div>

                    {/* Responsive image box */}
                    <div className="p-5">
                      <div className="w-full overflow-hidden rounded-lg border bg-white">
                        <img
                          src="/opoc/ubc-benefits.jpeg"
                          alt="Universal Benefit Card benefits overview"
                          className="w-full h-auto object-contain"
                          loading="lazy"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Trust & Information Section (revised for OPOC) */}
        <section id="policies" className="py-10">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="text-sm text-muted-foreground">
                Trust &amp; Information
              </div>
              <h3 className="text-2xl sm:text-3xl font-display font-bold">
                System Information &amp; Security
              </h3>

              <ul className="mt-5 list-disc pl-5 text-sm sm:text-base text-foreground/90 space-y-2">
                <li>
                  Single official identity record per individual (One State -
                  One Card)
                </li>
                <li>
                  Authorized establishment access for verification and record
                  handling
                </li>
                <li>
                  Department-level governance visibility and role-controlled
                  operations
                </li>
                <li>
                  Audit-friendly records to support integrity and accountability
                </li>
              </ul>
            </div>
          </div>
        </section>
        {/* OPOC Information Visuals */}
        <section className="py-10 bg-muted/10">
          <div className="container mx-auto px-4 space-y-8">
            {/* Feature Matrix */}
            {/* Registration Flow */}
            <Card className="border-2 border-primary/35 shadow-sm overflow-hidden">
              <CardContent className="p-0">
                <div className="border-b bg-muted/30 px-5 py-3">
                  <div className="text-sm font-semibold text-foreground">
                    Person Registration with Smart Card & Mobile Phone
                  </div>
                </div>

                <div className="p-5 flex justify-center">
                  <div className="w-full max-w-2xl">
                    <img
                      src="/opoc/slide1.jpeg"
                      alt="Person registration with smart card and mobile phone"
                      className="w-full h-auto rounded-lg border bg-white"
                      loading="lazy"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-2 border-primary/35 shadow-sm overflow-hidden">
              <CardContent className="p-0">
                <div className="border-b bg-muted/30 px-5 py-3">
                  <div className="text-sm font-semibold text-foreground">
                    AP PASS – OPOC Feature Matrix
                  </div>
                </div>

                <div className="p-5 flex justify-center">
                  <div className="w-full max-w-5xl">
                    <img
                      src="/opoc/slide2.png"
                      alt="AP PASS OPOC feature matrix"
                      className="w-full h-auto rounded-lg bg-white"
                      loading="lazy"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer id="contact" className="bg-[#ffcb05] text-[hsl(222 47% 11%)]">
        {/* <footer
        id="contact"
        className="text-primary-foreground"
        style={{
          backgroundColor: "#ffb200",
          backgroundImage:
            "linear-gradient(to right,#FF7700 0%,rgba(255,119,0,0) 55%),linear-gradient(to left,#ffcb05 0%,rgba(255,203,5,0) 55%)",
        }}
      > */}
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm opacity-95">
              © Government of Andhra Pradesh
            </div>

            <div className="text-[11px] sm:text-sm opacity-95 flex flex-wrap gap-x-2 gap-y-1 justify-start md:justify-center">
              <span className="underline underline-offset-2 cursor-default">
                Privacy Policy
              </span>
              <span className="opacity-80">|</span>
              <span className="underline underline-offset-2 cursor-default">
                Terms &amp; Conditions
              </span>
              <span className="opacity-80">|</span>
              <span className="underline underline-offset-2 cursor-default">
                Disclaimer
              </span>
              <span className="opacity-80">|</span>
              <span className="underline underline-offset-2 cursor-default">
                Accessibility Statement
              </span>
            </div>
            {/* 
            <div className="text-[11px] sm:text-xs opacity-95 md:text-right">
              Last Updated: 15-OCT-2025
            </div> */}
          </div>
        </div>
      </footer>
    </div>
  );
}