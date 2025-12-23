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

  const fetchUserContext = async (userId: string): Promise<UserContext | null> => {
    try {
      // Fetch user role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (roleError || !roleData) {
        console.error('Error fetching user role:', roleError);
        return null;
      }

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('auth_user_id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return null;
      }

      const context: UserContext = {
        authUserId: userId,
        role: roleData.role as AppRole,
        workerId: profileData?.worker_id || undefined,
        establishmentId: profileData?.establishment_id || undefined,
        departmentId: profileData?.department_id || undefined,
        fullName: profileData?.full_name || undefined,
        email: user?.email || undefined,
      };

      return context;
    } catch (error) {
      console.error('Error in fetchUserContext:', error);
      return null;
    }
  };

  const refreshUserContext = async () => {
    if (user) {
      const context = await fetchUserContext(user.id);
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
            fetchUserContext(session.user.id).then(setUserContext);
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
        fetchUserContext(session.user.id).then((context) => {
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
