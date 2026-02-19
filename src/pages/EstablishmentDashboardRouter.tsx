import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import EstablishmentDashboard from "@/pages/EstablishmentDashboard";
import RTCEstablishmentDashboard from "@/pages/RTCEstablishmentDashboard";
import HospitalDashboard from "@/pages/HospitalDashboard";

export default function EstablishmentDashboardRouter() {
  const { userContext } = useAuth();
  const [deptCode, setDeptCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);

      try {
        // preferred: departmentId already in context
        if (userContext?.departmentId) {
          const { data } = await supabase
            .from("departments")
            .select("code")
            .eq("id", userContext.departmentId)
            .maybeSingle();
          if (alive) setDeptCode(data?.code ?? null);
          return;
        }

        // fallback: derive from establishmentId
        if (userContext?.establishmentId) {
          const { data: est } = await supabase
            .from("establishments")
            .select("department_id")
            .eq("id", userContext.establishmentId)
            .maybeSingle();

          if (est?.department_id) {
            const { data: dept } = await supabase
              .from("departments")
              .select("code")
              .eq("id", est.department_id)
              .maybeSingle();

            if (alive) setDeptCode(dept?.code ?? null);
          } else {
            if (alive) setDeptCode(null);
          }
        }
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [userContext?.departmentId, userContext?.establishmentId]);

  if (loading) return null;

  // ✅ RTC branch
  if (deptCode === "RTC") return <RTCEstablishmentDashboard />;

  // ✅ AP Health branch
  if (deptCode === "APHEALTH") return <HospitalDashboard />;

  // ✅ default welfare
  return <EstablishmentDashboard />;
}
