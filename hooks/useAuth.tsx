import { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from 'react';
import { type Session, type User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useDemoStore } from '../store/demoStore';

export type Role = 'admin' | 'empleado';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  role: Role;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  role: 'empleado',
  isLoading: true,
  signIn: async () => {},
  signOut: async () => {},
});

const SYNTHETIC_DEMO_USER: User = {
  id: 'demo-user-evaluator',
  app_metadata: { role: 'admin' },
  user_metadata: { full_name: 'Evaluador Demo', name: 'Evaluador Demo' },
  aud: 'authenticated',
  created_at: '2026-01-01T00:00:00.000Z',
  email: 'demo@caobapos.local',
} as User;

const SYNTHETIC_DEMO_SESSION: Session = {
  access_token: 'demo-token',
  refresh_token: 'demo-refresh-token',
  expires_in: 86400,
  token_type: 'bearer',
  user: SYNTHETIC_DEMO_USER,
} as Session;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isDemoMode = useDemoStore((s) => s.isDemoMode);
  const setDemoMode = useDemoStore((s) => s.setDemoMode);
  const resetDemoData = useDemoStore((s) => s.resetDemoData);

  useEffect(() => {
    let mounted = true;

    // Safety timeout: If auth check hangs or fails, unblock loading after 2.5s
    const timeout = setTimeout(() => {
      if (mounted) {
        setIsLoading(false);
      }
    }, 2500);

    supabase.auth
      .getSession()
      .then(async (response) => {
        if (response?.error) {
          console.warn('[Auth] Session error on startup, clearing storage:', response.error);
          await supabase.auth.signOut().catch(() => {});
          if (mounted) {
            setSession(null);
            setIsLoading(false);
          }
          return;
        }
        if (mounted) {
          setSession(response?.data?.session ?? null);
          setIsLoading(false);
        }
      })
      .catch(async (err) => {
        console.error('[Auth] Error getting session on startup, purging token storage:', err);
        // Clean orphaned or expired refresh token from storage to avoid frozen app loops (Rule 2.B)
        await supabase.auth.signOut().catch(() => {});
        if (mounted) {
          setSession(null);
          setIsLoading(false);
        }
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (_event === 'TOKEN_REFRESHED' && !newSession) {
        await supabase.auth.signOut().catch(() => {});
      }
      if (mounted) {
        setSession(newSession);
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  // Compute effective session, user and role (giving admin permissions in Demo Mode)
  const effectiveSession = useMemo(() => {
    if (isDemoMode) return SYNTHETIC_DEMO_SESSION;
    return session;
  }, [isDemoMode, session]);

  const effectiveUser = useMemo(() => {
    if (isDemoMode) return SYNTHETIC_DEMO_USER;
    return session?.user ?? null;
  }, [isDemoMode, session]);

  // Security Hardening: Never trust user_metadata for authorization.
  // In Supabase, user_metadata is client-mutable via supabase.auth.updateUser().
  // Only app_metadata is immutable from client-side and set by admin/triggers.
  const roleClaim = session?.user?.app_metadata?.role;
  const role: Role = isDemoMode || roleClaim === 'admin' ? 'admin' : 'empleado';

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signOut() {
    if (isDemoMode) {
      setDemoMode(false);
      resetDemoData();
      return;
    }
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ session: effectiveSession, user: effectiveUser, role, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
