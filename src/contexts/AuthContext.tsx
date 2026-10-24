import { createContext, useContext, useEffect, useRef, useState, ReactNode, Fragment } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { QueryClient, useQueryClient } from '@tanstack/react-query';
import { clearMatchCaches } from '@/lib/matchCache';

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
  const queryClient = useQueryClient();
  const previousUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    // Old keys have no provable owner; discard rather than attach them to an account.
    clearMatchCaches(localStorage, true);
    // Check for guest mode
    const guestMode = localStorage.getItem('match-manager-guest');
    if (guestMode === 'true') {
      setIsGuest(true);
    }

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const nextUserId = session?.user.id ?? null;
        if (previousUserId.current !== undefined && previousUserId.current !== nextUserId) {
          clearMatchCaches(localStorage);
          queryClient.clear();
        }
        previousUserId.current = nextUserId;
        if (session) {
          setIsGuest(false);
          localStorage.removeItem('match-manager-guest');
        }
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      previousUserId.current = session?.user.id ?? null;
      if (session) {
        setIsGuest(false);
        localStorage.removeItem('match-manager-guest');
      }
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

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
    clearMatchCaches(localStorage);
    queryClient.clear();
    await supabase.auth.signOut();
    setIsGuest(false);
    localStorage.removeItem('match-manager-guest');
  };

  const enterAsGuest = async (queryClient?: QueryClient) => {
    // Guests must not retain an authenticated session or its recovery copies.
    if (user) await signOut();
    clearMatchCaches(localStorage);
    
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
    clearMatchCaches(localStorage);
    queryClient.clear();
    setIsGuest(false);
    localStorage.removeItem('match-manager-guest');
  };

  return (
    <AuthContext.Provider value={{ 
      user, session, isLoading, isGuest, signUp, signIn, signOut, enterAsGuest, exitGuest 
    }}>
      <Fragment key={isLoading ? 'loading' : isGuest ? 'guest' : user?.id ?? 'signed-out'}>
        {children}
      </Fragment>
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
