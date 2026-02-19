import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { UserContext, AppRole } from './types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userContext: UserContext | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshUserContext: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserContext = async (user: User): Promise<UserContext | null> => {
    try {
      const userId = user.id;
      let roleFromDb: AppRole | undefined;
      let profileRow: { department_id?: string | null; establishment_id?: string | null; worker_id?: string | null } | null = null;

      try {
        // ⚡ Run both queries in PARALLEL to cut login time in half
        const [roleResult, profileResult] = await Promise.all([
          supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
          supabase.from("profiles").select("department_id, establishment_id, worker_id").eq("auth_user_id", userId).maybeSingle(),
        ]);

        if (!roleResult.error && roleResult.data?.role) roleFromDb = roleResult.data.role as AppRole;
        if (!profileResult.error && profileResult.data) profileRow = profileResult.data as any;
      } catch (e) {
        console.warn("DB role/profile lookup failed, will fallback to metadata", e);
      }
      // 1. Get Role from Metadata
      // let rawRole = (user.user_metadata?.role || user.app_metadata?.role) as string;
      // let role: AppRole | undefined;

      // // Normalize Role
      // if (rawRole === 'department') role = 'DEPARTMENT_ADMIN';
      // else if (rawRole === 'establishment') role = 'ESTABLISHMENT_ADMIN';
      // else if (rawRole === 'worker') role = 'WORKER';
      // else if (rawRole === 'DEPARTMENT_ADMIN' || rawRole === 'ESTABLISHMENT_ADMIN' || rawRole === 'WORKER') role = rawRole as AppRole;

      // if (!role) {
      //   // Fallback: Check if in departments table
      //   const { data: dept } = await supabase.from('departments').select('id').eq('id', userId).maybeSingle();
      //   if (dept) role = 'DEPARTMENT_ADMIN';
      // }

      // if (!role) {
      //   console.warn('No role found for user');
      //   return null;
      // }

      // 1. Try New System (user_roles + profiles) FIRST
      // ✅ Resolve role (DB first, then old metadata, then department-id fallback)
      let role: AppRole | undefined = roleFromDb;

      if (!role) {
        let rawRole = (user.user_metadata?.role || user.app_metadata?.role) as string;

        if (rawRole === "department") role = "DEPARTMENT_ADMIN";
        else if (rawRole === "establishment") role = "ESTABLISHMENT_ADMIN";
        else if (rawRole === "worker") role = "WORKER";
        else if (rawRole === "employee") role = "EMPLOYEE";
        else if (rawRole === "DEPARTMENT_ADMIN" || rawRole === "ESTABLISHMENT_ADMIN" || rawRole === "WORKER" || rawRole === "EMPLOYEE")
          role = rawRole as AppRole;
      }

      if (!role) {
        // Old fallback: userId equals departments.id
        const { data: dept } = await supabase.from("departments").select("id").eq("id", userId).maybeSingle();
        if (dept) role = "DEPARTMENT_ADMIN";
      }

      if (!role) {
        console.warn("No role found for user");
        return null;
      }


      let profileData: any = {};

      // 2. Fetch Profile based on Role
      // if (role === 'DEPARTMENT_ADMIN') {
      //   const { data: deptData, error: deptError } = await supabase
      //     .from('departments')
      //     .select('*')
      //     .eq('id', userId)
      //     .maybeSingle();

      //   if (deptError) {
      //     console.error('Error fetching department profile:', deptError);
      //     // Don't return null, maybe just missing profile data
      //   }
      //   if (deptData) {
      //     profileData = {
      //       department_id: deptData.id,
      //       full_name: deptData.name,
      //       district: deptData.district,
      //     };
      //   }
      // } 
      if (role === 'DEPARTMENT_ADMIN') {
        // Prefer profiles mapping
        let departmentId = profileRow?.department_id || userId;

        const { data: deptData } = await supabase
          .from('departments')
          .select('*')
          .eq('id', departmentId)
          .maybeSingle();

        if (deptData) {
          profileData = {
            department_id: deptData.id,
            full_name: deptData.name,
            district: deptData.district,
            code: deptData.code,
          };
        }
      } else if (role === "ESTABLISHMENT_ADMIN") {
        const establishmentId = profileRow?.establishment_id || userId;

        const { data: estData, error: estError } = await supabase
          .from("establishments")
          .select("id, name, department_id")
          .eq("id", establishmentId)
          .maybeSingle();

        if (estError) console.error("Error fetching establishment profile:", estError);

        if (estData) {
          profileData = {
            establishment_id: estData.id,
            department_id: estData.department_id, // ✅ critical for RTC routing
            full_name: estData.name,
            district: undefined,
          };
        } else {
          profileData = {
            establishment_id: establishmentId,
            full_name: user.email,
          };
        }
      } else if (role === 'WORKER') {
        const meta = user.user_metadata || {};
        profileData = {
          worker_id: meta.worker_id, // Default to string ID
          full_name: meta.full_name || 'Worker',
        };

        // Prefer UUID from metadata if available (Added by backend login)
        if (meta.worker_uuid) {
          profileData.worker_id = meta.worker_uuid;
        } else if (meta.worker_id) {
          // Fallback: Try to fetch if metadata is stale (older logins)
          try {
            const { data: wData } = await supabase.from('workers').select('id, first_name, last_name').eq('worker_id', meta.worker_id).maybeSingle();
            if (wData) {
              profileData.full_name = `${wData.first_name || ''} ${wData.last_name || ''}`.trim();
              profileData.worker_id = wData.id;
            }
          } catch (e) {
            console.warn('Could not fetch worker profile', e);
          }
        }
      } else if (role === 'EMPLOYEE' || role === 'employee') {
        const meta = user.user_metadata || {};

        // 1. Try Profile Row first (Database Source of Truth)
        let estId = profileRow?.establishment_id;
        let deptId = profileRow?.department_id || meta.department_id || meta.departmentId;

        if (estId) {
          // Fetch Establishment + parent Department in parallel
          const [estResult, deptResult] = await Promise.all([
            supabase.from('establishments').select('id, name, code, department_id').eq('id', estId).maybeSingle(),
            // Also fetch dept if we already know deptId from profileRow
            deptId
              ? supabase.from('departments').select('id, name, code, district').eq('id', deptId).maybeSingle()
              : Promise.resolve({ data: null }),
          ]);

          const estData = estResult.data;
          let deptData = deptResult.data;

          // If dept not fetched yet, use estData.department_id
          if (!deptData && estData?.department_id) {
            const { data: d } = await supabase
              .from('departments')
              .select('id, name, code, district')
              .eq('id', estData.department_id)
              .maybeSingle();
            deptData = d;
          }

          if (estData) {
            profileData = {
              establishment_id: estData.id,
              department_id: estData.department_id || deptData?.id,
              full_name: meta.full_name || estData.name || 'Staff',
              // ✅ Use DEPARTMENT code (e.g. "APHEALTH") not establishment code
              code: deptData?.code || estData.code,
              dept_name: deptData?.name,
              district: deptData?.district,
            };
          }
        }

        // Fallback: dept only (no establishment)
        if (!profileData.establishment_id && deptId) {
          const { data: deptData } = await supabase
            .from('departments')
            .select('id, name, code, district')
            .eq('id', deptId)
            .maybeSingle();

          if (deptData) {
            profileData = {
              ...profileData,
              department_id: deptData.id,
              full_name: meta.full_name || 'Conductor',
              code: deptData.code,
              district: deptData.district,
              dept_name: deptData.name
            };
          }
        }
      }


      const context: UserContext = {
        authUserId: userId,
        role: role,
        workerId: profileData?.worker_id || undefined,
        establishmentId: profileData?.establishment_id || undefined,
        departmentId: profileData?.department_id || undefined,
        departmentCode: profileData?.code || undefined, // Mapped from profileData
        department: profileData?.department_id ? {
          id: profileData.department_id,
          name: profileData.dept_name || 'Department',
          code: profileData.code || '',
        } : undefined,
        fullName: profileData?.full_name || undefined,
        email: user.email || undefined,
        district: profileData?.district || undefined,
      };

      return context;
    } catch (error) {
      console.error('Error in fetchUserContext:', error);
      return null;
    }
  };

  const refreshUserContext = async () => {
    if (user) {
      const context = await fetchUserContext(user);
      setUserContext(context);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // Defer fetching user context
        if (session?.user) {
          setTimeout(() => {
            fetchUserContext(session.user).then(setUserContext);
          }, 0);
        } else {
          setUserContext(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchUserContext(session.user).then((context) => {
          setUserContext(context);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserContext(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        userContext,
        loading,
        signIn,
        signOut,
        refreshUserContext,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
