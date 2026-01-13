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
      // 1. Get Role from Metadata (Fallbacks for legacy)
      let role = (user.user_metadata?.role || user.app_metadata?.role) as AppRole;

      if (!role) {
        // Fallback: Check if in departments table
        const { data: dept } = await supabase.from('departments').select('id').eq('id', userId).maybeSingle();
        if (dept) role = 'department';
        // Else maybe worker? (Assuming 'worker' role default if not found)
      }

      if (!role) {
        console.warn('No role found for user');
        return null; // Or handle as guest?
      }

      let profileData: any = {};

      // 2. Fetch Profile based on Role
      if (role === 'department') {
        const { data: deptData, error: deptError } = await supabase
          .from('departments')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (deptError) {
          console.error('Error fetching department profile:', deptError);
          // Don't return null, maybe just missing profile data
        }
        if (deptData) {
          profileData = {
            department_id: deptData.id,
            full_name: deptData.name, // Mapping Query Result to Context Expectation
            // code: deptData.code 
          };
        }
      } else {
        // Assume Worker or existing Profile mechanism for others?
        // Since 'profiles' table is missing, we skip it.
        // If you have a 'workers' table mapped to auth, query that here.
        // For now, let's leave generic profile empty to unblock Department Login.
      }

      const context: UserContext = {
        authUserId: userId,
        role: role,
        workerId: profileData?.worker_id || undefined,
        establishmentId: profileData?.establishment_id || undefined,
        departmentId: profileData?.department_id || undefined,
        fullName: profileData?.full_name || undefined,
        email: user.email || undefined,
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
