export function Footer() {
  // Queste variabili verranno riempite automaticamente dal sistema
  const buildDate = import.meta.env.VITE_BUILD_DATE;
  const version = import.meta.env.VITE_APP_VERSION;

  return (
    <footer className="w-full py-4 text-center">
      <p className="text-xs text-muted-foreground/60">
        Release {version} • {buildDate}
      </p>
    </footer>
  );
}
