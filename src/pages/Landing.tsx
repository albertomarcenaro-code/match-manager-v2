import React from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Trophy, Users, Zap, Star, ArrowRight } from "lucide-react";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";

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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12 max-w-4xl mx-auto items-start">
            {/* Box Login/Registrazione */}
            <div className="bg-card border rounded-xl p-6 shadow-sm">
              <h3 className="text-xl font-bold mb-4">Inizia ora</h3>
              <Auth
                supabaseClient={supabase}
                appearance={{ theme: ThemeSupa }}
                theme="dark"
                providers={["google"]}
                redirectTo={window.location.origin + "/dashboard"}
              />
            </div>

            {/* Box Accesso Rapido */}
            <div className="flex flex-col gap-4 p-6 bg-secondary/5 rounded-xl border border-secondary/20 h-full justify-center">
              <h3 className="text-xl font-bold">Accesso Rapido</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Vuoi solo dare un'occhiata? Entra subito come ospite senza creare un account.
              </p>
              <Button 
                onClick={handleGuest} 
                size="lg" 
                className="w-full text-lg h-14 bg-secondary hover:bg-secondary/90 text-white"
              >
                Entra come Ospite
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </section>

        {/* Features Brevi */}
        <section className="border-t bg-muted/30 py-16">
          <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex gap-4 items-start">
              <div className="p-2 bg-background rounded-lg border shadow-sm"><Trophy className="text-secondary" /></div>
              <div><h4 className="font-bold">Tornei</h4><p className="text-sm text-muted-foreground">Crea tabelloni e gironi in pochi clic.</p></div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="p-2 bg-background rounded-lg border shadow-sm"><Users className="text-secondary" /></div>
              <div><h4 className="font-bold">Squadre</h4><p className="text-sm text-muted-foreground">Gestisci player e statistiche team.</p></div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="p-2 bg-background rounded-lg border shadow-sm"><Zap className="text-secondary" /></div>
              <div><h4 className="font-bold">Live</h4><p className="text-sm text-muted-foreground">Aggiornamenti punteggi in tempo reale.</p></div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
