import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Trophy, Plus, Trash2, ChevronLeft, Loader2, BarChart3, Eye,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

interface TournamentData {
  id: string;
  name: string;
  team_name: string;
  players: any[];
}

interface TournamentMatchRow {
  id: string;
  home_team_name: string;
  away_team_name: string;
  home_score: number;
  away_score: number;
  match_date: string;
  match_data: any;
  tournament_id: string;
}

export default function TournamentDetail() {
  const { id: tournamentId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [tournament, setTournament] = useState<TournamentData | null>(null);
  const [matches, setMatches] = useState<TournamentMatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    if (user && tournamentId) {
      loadTournament();
    } else {
      setLoading(false);
    }
  }, [user, tournamentId]);

  const loadTournament = async () => {
    if (!user || !tournamentId) return;
    setLoading(true);
    try {
      const { data: tData, error: tError } = await supabase
        .from("tournaments")
        .select("id, name, team_name, players")
        .eq("id", tournamentId)
        .eq("user_id", user.id)
        .single();

      if (tError) throw tError;
      setTournament(tData as TournamentData);

      const { data: mData, error: mError } = await supabase
        .from("matches")
        .select("id, home_team_name, away_team_name, home_score, away_score, match_date, match_data, tournament_id")
        .eq("tournament_id", tournamentId)
        .eq("user_id", user.id)
        .order("match_date", { ascending: false });

      if (mError) throw mError;
      setMatches((mData || []) as TournamentMatchRow[]);
    } catch (error: any) {
      console.error("Load tournament error:", error);
      toast.error("Errore nel caricamento del torneo");
      navigate("/tournaments");
    } finally {
      setLoading(false);
    }
  };

  const handleNewMatch = () => {
    if (!tournamentId) return;
    const matchId = `tournament-${tournamentId}-${Date.now()}`;
    navigate(`/match/${matchId}?tournamentId=${tournamentId}`);
  };

  const confirmDeleteMatch = async () => {
    if (!deleteTarget || !user) return;
    try {
      const { error } = await supabase
        .from("matches")
        .delete()
        .eq("id", deleteTarget)
        .eq("user_id", user.id);
      if (error) throw error;
      setMatches((prev) => prev.filter((m) => m.id !== deleteTarget));
      toast.success("Partita eliminata dal torneo");
    } catch (error: any) {
      toast.error(`Errore: ${error.message}`);
    } finally {
      setDeleteTarget(null);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("it-IT", {
        day: "2-digit", month: "2-digit", year: "2-digit",
        hour: "2-digit", minute: "2-digit",
      });
    } catch { return ""; }
  };

  // Aggregate stats from all match_data
  const computeGlobalStats = () => {
    let totalGoals = 0;
    let totalYellow = 0;
    let totalRed = 0;
    let wins = 0;
    let draws = 0;
    let losses = 0;
    const playerGoals: Record<string, number> = {};

    for (const m of matches) {
      totalGoals += m.home_score + m.away_score;

      // Determine result (home is "our" team)
      if (m.home_score > m.away_score) wins++;
      else if (m.home_score === m.away_score) draws++;
      else losses++;

      // Parse events from match_data if available
      if (m.match_data && typeof m.match_data === "object") {
        const events = (m.match_data as any).events || [];
        for (const ev of events) {
          if (ev.type === "goal" && ev.team === "home") {
            const name = ev.playerName || "Sconosciuto";
            playerGoals[name] = (playerGoals[name] || 0) + 1;
          }
          if (ev.type === "card") {
            if (ev.cardType === "yellow") totalYellow++;
            if (ev.cardType === "red") totalRed++;
          }
        }
      }
    }

    const topScorers = Object.entries(playerGoals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return { totalGoals, totalYellow, totalRed, wins, draws, losses, topScorers };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 p-4 max-w-2xl mx-auto w-full pt-6 text-center">
          <p className="text-muted-foreground">Torneo non trovato.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/tournaments")}>
            Torna ai Tornei
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const stats = computeGlobalStats();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 p-4 max-w-2xl mx-auto w-full pt-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/tournaments")}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold flex items-center gap-2 truncate">
              <Trophy className="h-6 w-6 text-yellow-500 shrink-0" />
              {tournament.name}
            </h1>
          </div>
          <Button variant="outline" size="sm" className="gap-1 shrink-0" onClick={() => setShowStats(true)}>
            <BarChart3 className="h-4 w-4" /> Statistiche
          </Button>
        </div>

        {/* New match button */}
        <Button onClick={handleNewMatch} className="w-full gap-2 mb-6">
          <Plus className="h-4 w-4" /> Nuova Partita nel Torneo
        </Button>

        {/* Match list */}
        <h2 className="text-lg font-semibold mb-3">Partite Disputate ({matches.length})</h2>

        {matches.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground text-sm">
              Nessuna partita disputata in questo torneo.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {matches.map((m) => (
              <Card key={m.id} className="p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <span className="truncate">{m.home_team_name}</span>
                    <span className="text-lg font-bold text-primary whitespace-nowrap">
                      {m.home_score} - {m.away_score}
                    </span>
                    <span className="truncate">{m.away_team_name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{formatDate(m.match_date)}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0"
                    onClick={() => navigate(`/match/${m.id}`)}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteTarget(m.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
      <Footer />

      {/* Delete match confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Vuoi eliminare questa partita dal torneo? L'azione è irreversibile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteMatch}>Elimina</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Global Stats Dialog */}
      <Dialog open={showStats} onOpenChange={setShowStats}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" /> Statistiche Globali
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Record */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <Card className="p-3">
                <p className="text-2xl font-bold text-green-600">{stats.wins}</p>
                <p className="text-xs text-muted-foreground">Vittorie</p>
              </Card>
              <Card className="p-3">
                <p className="text-2xl font-bold text-yellow-500">{stats.draws}</p>
                <p className="text-xs text-muted-foreground">Pareggi</p>
              </Card>
              <Card className="p-3">
                <p className="text-2xl font-bold text-destructive">{stats.losses}</p>
                <p className="text-xs text-muted-foreground">Sconfitte</p>
              </Card>
            </div>

            {/* Totals */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <Card className="p-3">
                <p className="text-2xl font-bold">{stats.totalGoals}</p>
                <p className="text-xs text-muted-foreground">Gol Totali</p>
              </Card>
              <Card className="p-3">
                <p className="text-2xl font-bold text-yellow-500">{stats.totalYellow}</p>
                <p className="text-xs text-muted-foreground">Ammonizioni</p>
              </Card>
              <Card className="p-3">
                <p className="text-2xl font-bold text-destructive">{stats.totalRed}</p>
                <p className="text-xs text-muted-foreground">Espulsioni</p>
              </Card>
            </div>

            {/* Top Scorers */}
            {stats.topScorers.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm mb-2">Classifica Marcatori</h3>
                <div className="space-y-1">
                  {stats.topScorers.map(([name, goals], i) => (
                    <div key={name} className="flex items-center justify-between text-sm px-2 py-1 rounded bg-muted/50">
                      <span className="font-medium">{i + 1}. {name}</span>
                      <span className="font-bold">{goals} ⚽</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {matches.length === 0 && (
              <p className="text-center text-muted-foreground text-sm">
                Nessuna partita disputata per calcolare le statistiche.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
