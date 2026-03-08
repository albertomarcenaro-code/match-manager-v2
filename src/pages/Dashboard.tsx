import React from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/card";
import { Trophy, Zap, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function Dashboard() {
  const navigate = useNavigate();
  const { isGuest } = useAuth();

  const handleSingleMatch = () => {
    if (isGuest) {
      navigate("/auth");
      toast.info("Accedi per gestire le partite singole.");
      return;
    }
    navigate("/single-matches");
  };

  const handleTournament = () => {
    if (isGuest) {
      navigate("/auth");
      toast.info("Accedi per gestire i tornei.");
      return;
    }
    navigate("/tournaments");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 p-4 sm:p-6 max-w-4xl mx-auto w-full flex flex-col items-center justify-center">
        <h1 className="text-2xl sm:text-3xl font-bold mb-8 text-center">
          Scegli la modalità di gioco
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
          {/* Partita Singola */}
          <Card
            className="p-8 flex flex-col items-center text-center gap-4 cursor-pointer hover:shadow-lg transition-all border-2 border-transparent hover:border-primary/20"
            onClick={handleSingleMatch}
          >
            {isGuest && (
              <div className="absolute top-3 right-3 bg-background p-1 rounded-full shadow-sm border border-muted">
                <Lock className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
            <div className="p-4 bg-primary/10 rounded-full">
              <Zap className="h-10 w-10 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Partita Singola</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Avvia e gestisci partite singole con cronometro e statistiche.
              </p>
            </div>
          </Card>

          {/* Torneo */}
          <Card
            className="p-8 flex flex-col items-center text-center gap-4 cursor-pointer hover:shadow-lg transition-all border-2 border-transparent hover:border-secondary/20"
            onClick={handleTournament}
          >
            {isGuest && (
              <div className="absolute top-3 right-3 bg-background p-1 rounded-full shadow-sm border border-muted">
                <Lock className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
            <div className="p-4 bg-secondary/10 rounded-full">
              <Trophy className="h-10 w-10 text-secondary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Torneo</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Crea tornei, gestisci classifiche e partite multiple.
              </p>
            </div>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
