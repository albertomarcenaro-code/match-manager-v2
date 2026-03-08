import React, { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Play, Eye, Trash2, Home, Loader2, LogIn } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
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
}

function getMatchHistory(): MatchSummary[] {
  const history: MatchSummary[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("match_state_")) {
      try {
        const data = JSON.parse(localStorage.getItem(key) || "");
        const matchId = key.replace("match_state_", "");
        const tsMatch = matchId.match(/\d+$/);
        const timestamp = tsMatch ? parseInt(tsMatch[0]) : 0;
        history.push({
          id: matchId,
          homeTeam: data.homeTeam?.name || "Casa",
          awayTeam: data.awayTeam?.name || "Ospiti",
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
  const { user } = useAuth();
  const [matchName, setMatchName] = useState("");
  const [matchHistory, setMatchHistory] = useState<MatchSummary[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  useEffect(() => {
    setMatchHistory(getMatchHistory());
  }, []);

  const handleCreate = () => {
    const id = "quick-" + Date.now();
    navigate(`/match/${id}`);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    localStorage.removeItem(`match_state_${deleteTarget}`);
    try {
      const list: string[] = JSON.parse(localStorage.getItem("match_list") || "[]");
      localStorage.setItem("match_list", JSON.stringify(list.filter((id) => id !== deleteTarget)));
    } catch {}
    setMatchHistory((prev) => prev.filter((m) => m.id !== deleteTarget));
    setDeleteTarget(null);
    toast.success("Partita eliminata");
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

        {matchHistory.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground text-sm">
              Nessuna partita salvata. Crea una nuova partita per iniziare.
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
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        match.isEnded
                          ? "bg-muted text-muted-foreground"
                          : match.isStarted
                          ? "bg-primary/10 text-primary"
                          : "bg-accent text-accent-foreground"
                      }`}
                    >
                      {match.isEnded ? "Terminata" : match.isStarted ? "In corso" : "Da iniziare"}
                    </span>
                    {match.timestamp > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {formatDate(match.timestamp)}
                      </span>
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
