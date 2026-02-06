import React from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Plus, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function Dashboard() {
  const navigate = useNavigate();
  const { isGuest } = useAuth();

  const handleTournamentClick = () => {
    if (isGuest) {
      toast.error("Accesso limitato", {
        description: "Devi essere registrato per creare e gestire i tornei nel database.",
        duration: 4000,
      });
      return;
    }
    navigate("/tournaments");
  };

  // FUNZIONE CORRETTA: Crea un ID unico per evitare l'errore 404
  const handleQuickMatch = () => {
    localStorage.removeItem('tournament-state'); 
    
    // Generiamo un ID temporaneo basato sulla data attuale
    const quickId = "quick-" + Date.now();
    
    // Navighiamo verso la rotta dinamica che abbiamo impostato in App.tsx
    navigate(`/match/${quickId}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 p-6 max-w-4xl mx-auto w-full">
        <h1 className="text-3xl font-bold mb-8">Benvenuto</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Box Gestione Tornei */}
          <Card className={`p-6 flex flex-col items-center text-center gap-4 transition-all border-2 relative ${
            isGuest 
              ? "opacity-80 border-muted bg-muted/5 shadow-none" 
              : "hover:shadow-lg border-secondary/20"
          }`}>
            
            {isGuest && (
              <div className="absolute top-3 right-3 bg-background p-1 rounded-full shadow-sm border border-muted">
                <Lock className="h-4 w-4 text-muted-foreground" />
              </div>
            )}

            <div className={`p-4 rounded-full ${isGuest ? "bg-muted" : "bg-secondary/10"}`}>
              <Trophy className={`h-8 w-8 ${isGuest ? "text-muted-foreground" : "text-secondary"}`} />
            </div>
            
            <div>
              <h2 className="text-xl font-bold">I Tuoi Tornei</h2>
              <p className="text-sm text-muted-foreground">
                {isGuest 
                  ? "Registrati per sbloccare la creazione di tornei e classifiche." 
                  : "Crea, modifica e gestisci le partite dei tuoi tornei."}
              </p>
            </div>

            <Button 
              onClick={handleTournamentClick} 
              className="w-full"
              variant={isGuest ? "secondary" : "default"}
            >
              {isGuest ? "Solo per utenti registrati" : "Vai ai Tornei"}
            </Button>
          </Card>

          {/* Box Nuova Partita Singola */}
          <Card className="p-6 flex flex-col items-center text-center gap-4 hover:shadow-lg transition-shadow border-2 border-transparent hover:border-primary/20">
            <div className="p-4 bg-primary/10 rounded-full">
              <Plus className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Partita Singola</h2>
              <p className="text-sm text-muted-foreground">Avvia subito una partita singola senza torneo.</p>
            </div>
            <Button onClick={handleQuickMatch} variant="outline" className="w-full">
              Inizia Partita
            </Button>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
