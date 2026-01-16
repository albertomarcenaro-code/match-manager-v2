import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import logo from '@/assets/logo.png';
import { User, LogOut, KeyRound, Mail, ChevronDown, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface HeaderProps {
  syncStatus?: 'connected' | 'disconnected' | 'checking';
}

export function Header({ syncStatus = 'checking' }: HeaderProps) {
  const { user, isGuest, signOut, exitGuest } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      if (isGuest) {
        exitGuest();
      } else {
        await signOut();
      }
      toast.success('Disconnesso');
      navigate('/');
    } catch (error) {
      toast.error('Errore durante la disconnessione');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!user?.email) {
      toast.error('Email non disponibile');
      return;
    }
    
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/dashboard`,
      });
      
      if (error) throw error;
      toast.success('Email di reset password inviata!');
    } catch (error) {
      toast.error('Errore nell\'invio dell\'email');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-6xl items-center justify-between gap-3 px-4 mx-auto">
        {/* Left: Logo */}
        <div className="flex items-center gap-3">
          <img src={logo} alt="Match Manager Live Logo" className="h-10 w-10 object-contain" />
        </div>
        
        {/* Center: Title with Sync LED */}
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold tracking-tight text-foreground" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
            Match Manager <span className="text-secondary">Live</span>
          </h1>
          {/* Sync Status LED */}
          {!isGuest && user && (
            <div 
              className={cn(
                "flex items-center gap-1 px-1.5 py-0.5 rounded-full",
                syncStatus === 'connected' && "bg-green-500/10",
                syncStatus === 'disconnected' && "bg-red-500/10",
                syncStatus === 'checking' && "bg-yellow-500/10"
              )}
              title={syncStatus === 'connected' ? 'Sincronizzato' : syncStatus === 'disconnected' ? 'Non sincronizzato' : 'Verifica...'}
            >
              {syncStatus === 'connected' ? (
                <Wifi className="h-3 w-3 text-green-600" />
              ) : syncStatus === 'disconnected' ? (
                <WifiOff className="h-3 w-3 text-red-600" />
              ) : (
                <Wifi className="h-3 w-3 text-yellow-600 animate-pulse" />
              )}
              <span className={cn(
                "w-2 h-2 rounded-full",
                syncStatus === 'connected' && "bg-green-500",
                syncStatus === 'disconnected' && "bg-red-500",
                syncStatus === 'checking' && "bg-yellow-500 animate-pulse"
              )} />
            </div>
          )}
        </div>
        
        {/* Right: User Menu */}
        <div className="flex items-center">
          {isGuest ? (
            <span className="px-2 py-1 rounded-md bg-muted text-xs font-medium text-muted-foreground">
              Ospite
            </span>
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5 h-9">
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleResetPassword} disabled={isLoading}>
                  <KeyRound className="h-4 w-4 mr-2" />
                  Reset Password
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleResetPassword} disabled={isLoading}>
                  <Mail className="h-4 w-4 mr-2" />
                  Recupero Password
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleLogout} 
                  disabled={isLoading}
                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Esci
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>
    </header>
  );
}
