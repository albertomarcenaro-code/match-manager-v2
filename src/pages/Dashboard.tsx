import React from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Plus } from "lucide-react"; // Rimosse icone inutilizzate per evitare warning
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 p-6 max-w-4xl mx-auto w-full">
        <h1 className="text-3xl font-bold mb-8">Benvenuto</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Box Gestione Tornei */}
          <Card className="p-6 flex flex-col items-center text-center gap-4 hover:shadow-lg transition-shadow border-2 border-secondary/20">
            <div className="p-4 bg-secondary/10 rounded-full">
              <Trophy className="h-8 w-8 text-secondary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">I Tuoi Tornei</h2>
              <p className="text-sm text-muted-foreground">Crea, modifica e gestisci le partite dei tuoi tornei.</p>
            </div>
            <Button onClick={() => navigate("/tournaments")} className="w-full">
              Vai ai Tornei
            </Button>
          </Card>

          {/* Box Nuova Partita Rapida */}
          <Card className="p-6 flex flex-col items-center text-center gap-4 hover:shadow-lg transition-shadow">
            <div className="p-4 bg-primary/10 rounded-full">
              <Plus className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Partita Rapida</h2>
              <p className="text-sm text-muted-foreground">Avvia subito una partita singola senza torneo.</p>
            </div>
            <Button onClick={() => navigate("/match")} variant="outline" className="w-full">
              Inizia Partita
            </Button>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
