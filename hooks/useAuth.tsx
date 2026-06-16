import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { type Session, type User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // El rol de autoridad vive en app_metadata (no manipulable por el usuario; lo usa el RLS).
  // Se mantiene el fallback a user_metadata por compatibilidad con sesiones antiguas.
  const roleClaim =
    session?.user?.app_metadata?.role ?? session?.user?.user_metadata?.role;
  const role: Role = roleClaim === 'admin' ? 'admin' : 'empleado';

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, role, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
