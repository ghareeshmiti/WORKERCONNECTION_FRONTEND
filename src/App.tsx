import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth-context";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { MockThalesAuth } from "@/components/MockThalesAuth";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

// Lazy load pages for code splitting
const LandingPage = lazy(() => import("@/pages/Landing"));
const AuthPage = lazy(() => import("@/pages/Auth"));
const WorkerRegister = lazy(() => import("@/pages/WorkerRegister"));
const EstablishmentRegister = lazy(() => import("@/pages/EstablishmentRegister"));
const DepartmentRegister = lazy(() => import("@/pages/DepartmentRegister"));
const RemoteAttendance = lazy(() => import("@/pages/RemoteAttendance"));
const WorkerDashboard = lazy(() => import("@/pages/WorkerDashboard"));
const EstablishmentDashboard = lazy(() => import("@/pages/EstablishmentDashboard"));
const DepartmentDashboard = lazy(() => import("@/pages/DepartmentDashboard"));
const NotFound = lazy(() => import("@/pages/NotFound"));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/register/worker" element={<WorkerRegister />} />
              <Route path="/register/establishment" element={<EstablishmentRegister />} />
              <Route path="/register/department" element={<DepartmentRegister />} />
              <Route path="/attendance" element={<RemoteAttendance />} />
              
              {/* Mock THALES auth screen */}
              <Route path="/thales-auth" element={
                <ProtectedRoute>
                  <MockThalesAuth />
                </ProtectedRoute>
              } />
              
              {/* Protected Worker routes */}
              <Route path="/worker/dashboard" element={
                <ProtectedRoute allowedRoles={['WORKER']}>
                  <WorkerDashboard />
                </ProtectedRoute>
              } />
              
              {/* Protected Establishment routes */}
              <Route path="/establishment/dashboard" element={
                <ProtectedRoute allowedRoles={['ESTABLISHMENT_ADMIN']}>
                  <EstablishmentDashboard />
                </ProtectedRoute>
              } />
              
              {/* Protected Department routes */}
              <Route path="/department/dashboard" element={
                <ProtectedRoute allowedRoles={['DEPARTMENT_ADMIN']}>
                  <DepartmentDashboard />
                </ProtectedRoute>
              } />
              
              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
