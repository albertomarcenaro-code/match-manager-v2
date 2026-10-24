import { Link } from 'react-router-dom';
import logo from '@/assets/logo.webp';

export function LiveFooter() {
  return (
    <footer className="mt-8 border-t border-border/40 bg-card/50">
      <div className="max-w-2xl mx-auto px-4 py-6 text-center">
        <Link to="/" className="inline-flex items-center gap-2 hover:opacity-80 transition-opacity">
          <img src={logo} alt="Match Manager" className="h-8 w-8" />
          <span className="font-bold text-foreground">Match Manager</span>
        </Link>
        <p className="text-sm text-muted-foreground mt-2">
          Creato con <span className="font-semibold text-foreground">Match Manager</span> — Gestisci anche tu il tuo Match!
        </p>
        <Link
          to="/"
          className="inline-block mt-3 text-xs font-semibold text-primary hover:underline"
        >
          Scopri di più →
        </Link>
      </div>
    </footer>
  );
}
