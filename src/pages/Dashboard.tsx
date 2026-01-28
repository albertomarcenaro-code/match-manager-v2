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

  /**
   * CORREZIONE: Genera un ID per la partita rapida.
   * Questo evita l'errore 404 perché la rotta ora si aspetta /match/:id
   */
  const handleQuickMatch = () => {
    localStorage.removeItem('tournament-state'); // Pulisce stati precedenti
    
    // Creiamo un ID univoco "temporaneo" per la partita rapida
    const quickMatchId = "new-" + Date.now();
    
    // Navighiamo verso l'URL dinamico
    navigate(`/match/${quickMatchId}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans">
      <Header />
      
      <main className="flex-1 p-6 max-w-4xl mx-auto w-full">
        <div className="mb-10">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
            Bentornato in <span className="text-[#2ea35f]">Campo</span>
          </h1>
          <p className="text-muted-foreground mt-2">Cosa vuoi gestire oggi?</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Box Gestione Tornei */}
          <Card className={`group p-8 flex flex-col items-center text-center gap-5 transition-all border-2 relative overflow-hidden ${
            isGuest 
              ? "opacity-80 border-muted bg-muted/5 shadow-none" 
              : "hover:shadow-2xl hover:border-[#2ea35f]/30 border-border/60"
          }`}>
            
            {isGuest && (
              <div className="absolute top-4 right-4 bg-background p-1.5 rounded-full shadow-sm border border-muted z-10">
                <Lock className="h-4 w-4 text-muted-foreground" />
              </div>
            )}

            <div className={`p-5 rounded-2xl transition-transform group-hover:scale-110 ${isGuest ? "bg-muted" : "bg-secondary/10"}`}>
              <Trophy className={`h-10 w-10 ${isGuest ? "text-muted-foreground" : "text-secondary"}`} />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">I Tuoi Tornei</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {isGuest 
                  ? "Registrati per sbloccare la creazione di tornei, tabelloni e classifiche automatiche." 
                  : "Accedi all'area tornei per gestire campionati, coppe e aggiornare le classifiche live."}
              </p>
            </div>

            <Button 
              onClick={handleTournamentClick} 
              className={`w-full h-12 rounded-xl font-bold transition-all ${isGuest ? "bg-muted text-muted-foreground" : "shadow-md hover:shadow-lg"}`}
              variant={isGuest ? "secondary" : "default"}
            >
              {isGuest ? "Funzione Bloccata" : "Vai ai Tornei"}
            </Button>
          </Card>

          {/* Box Nuova Partita Rapida */}
          <Card className="group p-8 flex flex-col items-center text-center
