import { toast } from "sonner";
import { APP_VERSION } from "@/version";

export function Footer() {
  // Versione: maggiore manuale (src/version.ts) + build number automatico
  const version = APP_VERSION;
  const buildDate = import.meta.env.VITE_APP_BUILD_DATE || "11/03/2026";


  const handleForceRefresh = async () => {
    toast("Controllo aggiornamenti in corso...", {
      description: "La pagina si ricaricherà tra qualche istante.",
    });

    // Disattiva tutti i Service Worker registrati
    if ("serviceWorker" in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((reg) => reg.unregister()));
      } catch {
        // Ignora errori silenziosamente: il reload forzato pulirà comunque lo stato
      }
    }

    // Svuota le cache dell'app
    if ("caches" in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      } catch {
        // Ignora errori silenziosamente
      }
    }

    // Ricarica forzatamente la pagina ignorando la cache
    window.location.reload();
  };

  return (
    <footer className="w-full py-4 text-center">
      <button
        type="button"
        onClick={handleForceRefresh}
        className="text-xs text-muted-foreground/60 hover:text-foreground hover:underline cursor-pointer transition-colors"
        aria-label="Forza aggiornamento all'ultima versione"
      >
        Release {version} • {buildDate}

      </button>
    </footer>
  );
}
