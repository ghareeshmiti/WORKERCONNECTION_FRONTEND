import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import ConductorDashboard from "@/pages/ConductorDashboard";
import HospitalEntry from "@/pages/HospitalEntry";

export default function EmployeeDashboardRouter() {
    const { userContext } = useAuth();
    const [deptCode, setDeptCode] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let alive = true;

        async function load() {
            setLoading(true);
            try {
                // Use departmentCode from context if available
                if (userContext?.departmentCode) {
                    if (alive) setDeptCode(userContext.departmentCode);
                    return;
                }

                // Derive from establishmentId
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
                } else {
                    if (alive) setDeptCode(null);
                }
            } finally {
                if (alive) setLoading(false);
            }
        }

        load();
        return () => { alive = false; };
    }, [userContext?.departmentCode, userContext?.establishmentId]);

    if (loading) return null;

    // ✅ AP Health branch → Hospital Entry (Operator)
    if (deptCode === "APHEALTH") return <HospitalEntry />;

    // ✅ Default → RTC Conductor
    return <ConductorDashboard />;
}
