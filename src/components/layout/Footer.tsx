export function Footer() {
  // Queste variabili vengono riempite automaticamente durante il caricamento (Build)
  const version = import.meta.env.VITE_APP_VERSION || "0.2.5";
  const buildDate = import.meta.env.VITE_APP_BUILD_DATE || "08/03/2026";

  return (
    <footer className="w-full py-4 text-center">
      <p className="text-xs text-muted-foreground/60">
        Release {version} • {buildDate}
      </p>
    </footer>
  );
}
