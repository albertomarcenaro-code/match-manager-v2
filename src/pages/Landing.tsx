import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Trophy, Users, Zap, Star } from "lucide-react";

export default function Landing() {
  const navigate = useNavigate();
  const { loginAsGuest } = useAuth();

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
      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-8 max-w-4xl mx-auto">
        <div className="space-y-4">
          <div className="inline-block p-3 bg-secondary/10 rounded-2xl mb-4">
            <Trophy className="h-12 w-12 text-secondary animate-pulse" />
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter">
            Match Manager <span className="text-secondary">Live</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-[600px] mx-auto">
            La piattaforma definitiva per gestire i tuoi tornei, tracciare i risultati e dominare la classifica.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
          <Button 
            onClick={() => navigate("/dashboard")} 
            size="lg" 
            className="flex-1 text-lg h-14 shadow-lg shadow-primary/20"
          >
            Inizia Ora
          </Button>
          <Button 
            onClick={handleGuest} 
            variant="outline" 
            size="lg" 
            className="flex-1 text-lg h-14"
          >
            Prova come Ospite
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12 w-full">
          <div className="flex flex-col items-center space-y-2 p-4">
            <Users className="h-6 w-6 text-secondary" />
            <h3 className="font-bold">Multiplayer</h3>
            <p className="text-sm text-muted-foreground text-center">Gestisci squadre e giocatori con facilità.</p>
          </div>
          <div className="flex flex-col items-center space-y-2 p-4">
            <Zap className="h-6 w-6 text-secondary" />
            <h3 className="font-bold">Tempo Reale</h3>
            <p className="text-sm text-muted-foreground text-center">Risultati aggiornati istantaneamente.</p>
          </div>
          <div className="flex flex-col items-center space-y-2 p-4">
            <Star className="h-6 w-6 text-secondary" />
            <h3 className="font-bold">Classifiche</h3>
            <p className="text-sm text-muted-foreground text-center">Generazione automatica dei ranking.</p>
          </div>
        </div>
      </main>

      <footer className="p-6 text-center text-sm text-muted-foreground border-t">
        © 2024 Match Manager Live - Tutti i diritti riservati
      </footer>
    </div>
  );
}
