import React, { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Plus, Lock, History, Play, Eye, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface MatchSummary {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  isEnded: boolean;
  isStarted: boolean;
  timestamp: number;
}

function getMatchHistory(): MatchSummary[] {
  const history: MatchSummary[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('match_state_')) {
      try {
        const data = JSON.parse(localStorage.getItem(key) || '');
        const matchId = key.replace('match_state_', '');
        const tsMatch = matchId.match(/\d+$/);
        const timestamp = tsMatch ? parseInt(tsMatch[0]) : 0;
        history.push({
          id: matchId,
          homeTeam: data.homeTeam?.name || 'Casa',
          awayTeam: data.awayTeam?.name || 'Ospiti',
          homeScore: data.homeTeam?.score || 0,
          awayScore: data.awayTeam?.score || 0,
          isEnded: data.isMatchEnded || false,
          isStarted: data.isMatchStarted || false,
          timestamp,
        });
      } catch {}
    }
  }
  return history.sort((a, b) => b.timestamp - a.timestamp);
}

const formatDate = (ts: number) => {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleDateString('it-IT', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return ''; }
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { isGuest } = useAuth();
  const [matchHistory, setMatchHistory] = useState<MatchSummary[]>([]);

  useEffect(() => {
    setMatchHistory(getMatchHistory());
  }, []);

  const handleTournamentClick = () => {
    if (isGuest) {
      toast.error("Accesso limitato", {
        description: "Devi essere registrato per creare e gestire i tornei.",
        duration: 4000,
      });
      return;
    }
    navigate("/tournaments");
  };

  const handleQuickMatch = () => {
    const quickId = "quick-" + Date.now();
    navigate(`/match/${quickId}`);
  };

  const handleDeleteMatch = (matchId: string) => {
    localStorage.removeItem(`match_state_${matchId}`);
    try {
      const list: string[] = JSON.parse(localStorage.getItem('match_list') || '[]');
      localStorage.setItem('match_list', JSON.stringify(list.filter(id => id !== matchId)));
    } catch {}
    setMatchHistory(prev => prev.filter(m => m.id !== matchId));
    toast.success("Partita eliminata");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 p-4 sm:p-6 max-w-4xl mx-auto w-full">
        <h1 className="text-3xl font-bold mb-6">Benvenuto</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tornei Card */}
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
                  ? "Registrati per sbloccare tornei e classifiche." 
                  : "Crea, modifica e gestisci le partite dei tuoi tornei."}
              </p>
            </div>
            <Button onClick={handleTournamentClick} className="w-full" variant={isGuest ? "secondary" : "default"}>
              {isGuest ? "Solo per utenti registrati" : "Vai ai Tornei"}
            </Button>
          </Card>

          {/* Partite Singole Card - now symmetric with Tornei */}
          <Card className="p-6 flex flex-col items-center text-center gap-4 hover:shadow-lg transition-shadow border-2 border-transparent hover:border-primary/20">
            <div className="p-4 bg-primary/10 rounded-full">
              <Plus className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Partite Singole</h2>
              <p className="text-sm text-muted-foreground">
                {matchHistory.length > 0 
                  ? `${matchHistory.length} partite salvate` 
                  : "Avvia una partita singola senza torneo."}
              </p>
            </div>
            <Button onClick={handleQuickMatch} variant="outline" className="w-full gap-2">
              <Plus className="h-4 w-4" /> Nuova Partita
            </Button>
          </Card>
        </div>

        {/* Match History - hidden for guests */}
        {isGuest ? (
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-4">
              <History className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-xl font-bold">Storico Partite Singole</h2>
            </div>
            <Card className="p-8 text-center relative">
              <Lock className="h-8 w-8 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-muted-foreground text-sm font-medium">
                Registrati per salvare e consultare lo storico delle tue partite.
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3 gap-1"
                onClick={() => navigate('/auth')}
              >
                Accedi o Registrati
              </Button>
            </Card>
          </div>
        ) : (
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-4">
              <History className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-xl font-bold">Storico Partite Singole</h2>
            </div>

            {matchHistory.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground text-sm">
                  Nessuna partita salvata. Avvia una nuova partita singola per iniziare.
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {matchHistory.map((match) => (
                  <Card key={match.id} className="p-4 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <span className="truncate">{match.homeTeam}</span>
                        <span className="text-lg font-bold text-primary whitespace-nowrap">
                          {match.homeScore} - {match.awayScore}
                        </span>
                        <span className="truncate">{match.awayTeam}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          match.isEnded 
                            ? 'bg-muted text-muted-foreground' 
                            : match.isStarted 
                              ? 'bg-primary/10 text-primary' 
                              : 'bg-accent text-accent-foreground'
                        }`}>
                          {match.isEnded ? 'Terminata' : match.isStarted ? 'In corso' : 'Da iniziare'}
                        </span>
                        {match.timestamp > 0 && (
                          <span className="text-xs text-muted-foreground">{formatDate(match.timestamp)}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        size="sm"
                        variant={match.isEnded ? "outline" : "default"}
                        className="gap-1 h-8 text-xs"
                        onClick={() => navigate(`/match/${match.id}`)}
                      >
                        {match.isEnded ? (
                          <><Eye className="h-3 w-3" /> Vedi</>
                        ) : (
                          <><Play className="h-3 w-3" /> Riprendi</>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteMatch(match.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
