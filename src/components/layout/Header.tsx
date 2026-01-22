import { useState, forwardRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import logo from '@/assets/logo.png';
import { User, LogOut, KeyRound, Wifi, WifiOff, Home, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface HeaderProps {
  syncStatus?: 'connected' | 'disconnected' | 'checking';
  isTournamentMode?: boolean;
  onTournamentModeChange?: (enabled: boolean) => void;
  onNewMatch?: () => void;
  showNavButtons?: boolean;
}

export const Header = forwardRef<HTMLElement, HeaderProps>(({ 
  syncStatus = 'checking', 
  isTournamentMode = false, 
  onTournamentModeChange,
  onNewMatch,
  showNavButtons = false,
}, ref) => {
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

  const handleGoHome = () => {
    navigate('/dashboard');
  };

  const canToggleTournament = user && !isGuest;

  return (
    <header ref={ref} className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-6xl items-center justify-between gap-2 px-3 mx-auto">
        
        {/* Left: Logo + Text + Nav Buttons */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 mr-1">
            <img src={logo} alt="Match Manager Live Logo" className="h-8 w-8 object-contain" />
            <span className="font-bold text-sm sm:text-base tracking-tight leading-none whitespace-nowrap">
              <span className="text-slate-900">Match Manager</span>{' '}
              <span className="text-green-500">Live</span>
            </span>
          </div>
          
          {showNavButtons && (
            <div className="flex items-center gap-1 border-l pl-2 border-border/60">
              <Button variant="ghost" size="sm" onClick={handleGoHome} className="gap-1 h-8 px-2">
                <Home className="h-4 w-4" />
                <span className="hidden md:inline text-xs">Home</span>
              </Button>
              {onNewMatch && (
                <Button variant="ghost" size="sm" onClick={onNewMatch} className="gap-1 h-8 px-2">
                  <Plus className="h-4 w-4" />
                  <span className="hidden md:inline text-xs">Nuova</span>
                </Button>
              )}
            </div>
          )}
        </div>
        
        {/* Center: Toggle Switch */}
        <div className="flex items-center gap-2">
          {onTournamentModeChange && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={cn(
                    "flex items-center gap-2 px-2 py-1 rounded-full transition-colors",
                    !canToggleTournament && "opacity-50"
                  )}>
                    <Label 
                      htmlFor="tournament-toggle" 
                      className={cn(
                        "text-[10px] sm:text-xs cursor-pointer transition-colors",
                        !isTournamentMode ? "text-foreground font-medium" : "text-muted-foreground"
                      )}
                    >
                      Singola
                    </Label>
                    <Switch
                      id="tournament-toggle"
                      checked={isTournamentMode}
                      onCheckedChange={onTournamentModeChange}
                      disabled={!canToggleTournament}
                      className="scale-75 sm:scale-90 data-[state=checked]:bg-secondary"
                    />
                    <Label 
                      htmlFor="tournament-toggle" 
                      className={cn(
                        "text-[10px] sm:text-xs cursor-pointer transition-colors",
                        isTournamentMode ? "text-secondary font-medium" : "text-muted-foreground"
                      )}
                    >
                      Torneo
                    </Label>
                  </div>
                </TooltipTrigger>
                {!canToggleTournament && (
                  <TooltipContent>
                    <p>Accedi per usare la modalità torneo</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          )}
          
          {/* Sync Status LED */}
          {!isGuest && user && (
            <div 
              className={cn(
                "hidden xs:flex items-center gap-1 px-1.5 py-0.5 rounded-full",
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
            </div>
          )}
        </div>
        
        {/* Right: User Menu */}
        <div className="flex items-center">
          {isGuest ? (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLogout}
              disabled={isLoading}
              className="gap-1 h-8 px-2 border-destructive/50 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-3 w-3" />
              <span className="text-[10px] font-bold">ESCI</span>
            </Button>
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleResetPassword} disabled={isLoading}>
                  <KeyRound className="h-4 w-4 mr-2" />
                  Reset Password
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
});

Header.displayName = 'Header';
