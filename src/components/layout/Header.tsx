import logo from '@/assets/logo.png';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-6xl items-center gap-3 px-4 mx-auto">
        <img src={logo} alt="Match Manager Live Logo" className="h-10 w-10 object-contain" />
        <h1 className="text-lg font-bold tracking-tight text-foreground" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
          Match Manager <span className="text-secondary">Live</span>
        </h1>
      </div>
    </header>
  );
}
