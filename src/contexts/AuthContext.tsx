import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { QueryClient } from '@tanstack/react-query';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isGuest: boolean;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  enterAsGuest: (queryClient?: QueryClient) => Promise<void>;
  exitGuest: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    // Check for guest mode
    const guestMode = localStorage.getItem('match-manager-guest');
    if (guestMode === 'true') {
      setIsGuest(true);
    }

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsGuest(false);
    localStorage.removeItem('match-manager-guest');
  };

  const enterAsGuest = async (queryClient?: QueryClient) => {
    // HARD RESET: Pulizia dati
    localStorage.removeItem('match-manager-state');
    localStorage.removeItem('match-timer-state');
    localStorage.removeItem('tournament-state');
    
    if (queryClient) {
      queryClient.clear();
    }
    
    // Impostazione stato ospite
    localStorage.setItem('match-manager-guest', 'true');
    setIsGuest(true);
    
    // Restituiamo una Promise risolta per permettere l'await nella Landing
    return Promise.resolve();
  };

  const exitGuest = () => {
    setIsGuest(false);
    localStorage.removeItem('match-manager-guest');
    localStorage.removeItem('match-manager-state');
    localStorage.removeItem('match-timer-state');
  };

  return (
    <AuthContext.Provider value={{ 
      user, session, isLoading, isGuest, signUp, signIn, signOut, enterAsGuest, exitGuest 
    }}>
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
