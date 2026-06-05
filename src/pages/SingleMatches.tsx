import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Play, Eye, Trash2, Home, Loader2, LogIn, WifiOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface MatchSummary {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  isEnded: boolean;
  isStarted: boolean;
  timestamp: number;
  source: "db";
}

const formatDate = (ts: number) => {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

export default function SingleMatches() {
  const navigate = useNavigate();
  const { user, isGuest } = useAuth();
  const [matchName, setMatchName] = useState("");
  const [matchHistory, setMatchHistory] = useState<MatchSummary[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dbError, setDbError] = useState(false);

  // Always load from cloud database for logged-in users
  useEffect(() => {
    if (!isGuest && user) {
      loadFromDatabase();
    }
  }, [user, isGuest]);

  const loadFromDatabase = async () => {
    if (!user) return;
    setLoading(true);
    setDbError(false);
    try {
      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .eq("user_id", user.id)
        .is("tournament_id", null) // Only single matches, not tournament ones
        .order("created_at", { ascending: false });

      if (error) throw error;

      const matches: MatchSummary[] = (data || []).map((m) => ({
        id: m.id,
        homeTeam: m.home_team_name,
        awayTeam: m.away_team_name,
        homeScore: m.home_score,
        awayScore: m.away_score,
        isEnded: (m as any).status === "completed",
        isStarted: true,
        timestamp: new Date(m.created_at).getTime(),
        source: "db" as const,
      }));

      setMatchHistory(matches);
    } catch (err) {
      console.error("Failed to load matches from database:", err);
      setDbError(true);
      toast.error("Errore nel caricamento delle partite dal database");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    const id = crypto.randomUUID();
    navigate(`/match/${id}`);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    
    try {
      const { error } = await supabase
        .from("matches")
        .delete()
        .eq("id", deleteTarget);
      
      if (error) throw error;
      
      // Also clean up any localStorage remnant
      localStorage.removeItem(`match_state_${deleteTarget}`);
      
      setMatchHistory((prev) => prev.filter((m) => m.id !== deleteTarget));
      toast.success("Partita eliminata");
    } catch (err) {
      console.error("Failed to delete match:", err);
      toast.error("Errore nell'eliminazione della partita");
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 p-4 max-w-2xl mx-auto w-full pt-6">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <Home className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Partite Singole</h1>
        </div>

        <div className="flex gap-2 mb-8">
          <Input
            placeholder="Nome partita (opzionale)..."
            value={matchName}
            onChange={(e) => setMatchName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <Button onClick={handleCreate} className="gap-1 shrink-0">
            <Plus className="h-4 w-4" /> Nuova
          </Button>
        </div>

        <h2 className="text-lg font-semibold mb-3">Storico Partite</h2>

        {isGuest ? (
          <Card className="p-8 text-center space-y-3">
            <LogIn className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground text-sm">
              Esegui il login per salvare e rivedere le tue partite precedenti.
            </p>
            <Button variant="outline" size="sm" onClick={() => navigate("/auth")}>
              Accedi
            </Button>
          </Card>
        ) : dbError ? (
          <Card className="p-8 text-center space-y-3">
            <WifiOff className="h-8 w-8 mx-auto text-destructive" />
            <p className="text-muted-foreground text-sm">
              Impossibile connettersi al database. Controlla la connessione e riprova.
            </p>
            <Button variant="outline" size="sm" onClick={loadFromDatabase}>
              Riprova
            </Button>
          </Card>
        ) : loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
          </div>
        ) : matchHistory.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground text-sm">
              Nessuna partita salvata. Crea una nuova partita per iniziare.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {matchHistory.map((match) => (
              <Card key={match.id} className="p-4 space-y-2">
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold truncate">{match.homeTeam}</span>
                    <span className="text-lg font-bold text-primary tabular-nums shrink-0">{match.homeScore}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold truncate">{match.awayTeam}</span>
                    <span className="text-lg font-bold text-primary tabular-nums shrink-0">{match.awayScore}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      {match.timestamp > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {formatDate(match.timestamp)}
                        </span>
                      )}
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          match.isEnded
                            ? "bg-muted text-muted-foreground"
                            : "bg-primary/10 text-primary"
                        }`}
                      >
                        {match.isEnded ? "Terminata" : "In corso"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant={match.isEnded ? "outline" : "default"}
                        className="gap-1 h-8 text-xs"
                        onClick={() => {
                          if (match.isEnded) {
                            navigate(`/match-summary/${match.id}?source=db&backTo=/single-matches`);
                          } else {
                            navigate(`/match/${match.id}`);
                          }
                        }}
                      >
                        {match.isEnded ? (
                          <>
                            <Eye className="h-3 w-3" /> Vedi
                          </>
                        ) : (
                          <>
                            <Play className="h-3 w-3" /> Riprendi
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteTarget(match.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
      <Footer />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler cancellare questo elemento?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Elimina</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
