import React from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Trophy, Users, Zap, Star, ArrowRight, LogIn } from "lucide-react";

export default function Landing() {
  const navigate = useNavigate();
  const { user, loginAsGuest } = useAuth();

  // Se l'utente è già loggato, lo mandiamo in dashboard
  React.useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const handleGuest = async () => {
    try {
      await loginAsGuest();
      navigate("/dashboard");
    } catch (error) {
      console.error("Errore login ospite:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 px-6 text-center max-w-5xl mx-auto space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 text-secondary text-sm font-medium mb-4">
            <Star className="h-4 w-4 fill-current" />
            <span>Il miglior gestore di tornei live</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">
            Gestisci i tuoi match come un <span className="text-secondary">Professionista</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Organizza tornei, tieni traccia dei punteggi in tempo reale e genera classifiche automatiche. Tutto in un'unica piattaforma.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12 max-w-4xl mx-auto items-stretch">
            {/* Box Login / Registrazione */}
            <div className="bg-card border rounded-2xl p-8 shadow-sm flex flex-col items-center justify-center text-center space-y-6">
              <div className="p-3 bg-primary/10 rounded-full">
                <LogIn className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">Bentornato</h3>
                <p className="text-muted-foreground mt-2">Accedi al tuo account per gestire i tuoi tornei salvati.</p>
              </div>
              <Button 
                onClick={() => navigate("/dashboard")} 
                size="lg" 
                className="w-full h-14 text-lg font-semibold"
              >
                Accedi ora
              </Button>
            </div>

            {/* Box Accesso Rapido / Ospite */}
            <div className="bg-secondary/5 border border-secondary/20 rounded-2xl p-8 shadow-sm flex flex-col items-center justify-center text-center space-y-6">
              <div className="p-3 bg-secondary/10 rounded-full">
                <Users className="h-8 w-8 text-secondary" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">Entra come Ospite</h3>
                <p className="text-muted-foreground mt-2">Prova tutte le funzionalità subito, senza registrazione.</p>
              </div>
              <Button 
                onClick={handleGuest} 
                variant="outline" 
                size="lg" 
                className="w-full h-14 text-lg font-semibold border-secondary text-secondary hover:bg-secondary/10"
              >
                Prova Gratis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="border-t bg-muted/30 py-16">
          <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex gap-4 items-start p-4 bg-background rounded-xl border shadow-sm">
              <Trophy className="text-secondary h-6 w-6 shrink-0" />
              <div>
                <h4 className="font-bold">Tornei</h4>
                <p className="text-sm text-muted-foreground text-left">Crea tabelloni e gironi in pochi clic.</p>
              </div>
            </div>
            <div className="flex gap-4 items-start p-4 bg-background rounded-xl border shadow-sm">
              <Users className="text-secondary h-6 w-6 shrink-0" />
              <div>
                <h4 className="font-bold">Squadre</h4>
                <p className="text-sm text-muted-foreground text-left">Gestisci player e statistiche team.</p>
              </div>
            </div>
            <div className="flex gap-4 items-start p-4 bg-background rounded-xl border shadow-sm">
              <Zap className="text-secondary h-6 w-6 shrink-0" />
              <div>
                <h4 className="font-bold">Live</h4>
                <p className="text-sm text-muted-foreground text-left">Aggiornamenti punteggi in tempo reale.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
