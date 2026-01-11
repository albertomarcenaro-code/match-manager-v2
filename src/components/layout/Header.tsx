import { useAuth } from '@/contexts/AuthContext';
import logo from '@/assets/logo.png';

export function Header() {
  const { user, isGuest } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-6xl items-center justify-between gap-3 px-4 mx-auto">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Match Manager Live Logo" className="h-10 w-10 object-contain" />
          <h1 className="text-lg font-bold tracking-tight text-foreground" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
            Match Manager <span className="text-secondary">Live</span>
          </h1>
        </div>
        
        {/* User/Guest Status */}
        <div className="text-sm text-muted-foreground">
          {isGuest ? (
            <span className="px-2 py-1 rounded-md bg-muted text-xs font-medium">
              Modalità Ospite
            </span>
          ) : user ? (
            <span className="text-xs truncate max-w-[150px]">
              Utente: {user.email}
            </span>
          ) : null}
        </div>
      </div>
    </header>
  );
}
