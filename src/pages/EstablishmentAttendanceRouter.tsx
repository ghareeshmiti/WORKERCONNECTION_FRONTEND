import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

import EstablishmentAttendance from "@/pages/EstablishmentAttendance";

import RTCEstablishmentAttendance from "@/pages/RTCEstablishmentAttendance";

export default function EstablishmentAttendanceRouter() {
  const { userContext } = useAuth();
  const [deptCode, setDeptCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      try {
        // Prefer departmentId from context
        if (userContext?.departmentId) {
          const { data } = await supabase
            .from("departments")
            .select("code")
            .eq("id", userContext.departmentId)
            .maybeSingle();
          if (alive) setDeptCode(data?.code ?? null);
          return;
        }

        // Fallback: derive via establishment
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

  if (deptCode === "RTC") return <RTCEstablishmentAttendance />;

  return <EstablishmentAttendance />;
}