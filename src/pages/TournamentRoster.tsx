import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Users, Plus, Trash2, ChevronLeft, Loader2, Save, Trophy, Download,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useTournamentJerseys, RosterEntry } from "@/hooks/useTournamentJerseys";

interface SavedTeam {
  id: string;
  name: string;
  category: string;
  players: { name: string; number: number | null }[];
}

interface DraftPlayer {
  id: string;
  name: string;
  number: number | null;
  existed: boolean; // was loaded from DB
}

export default function TournamentRoster() {
  const { id: tournamentId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [tournamentName, setTournamentName] = useState<string>("");
  const [loadingMeta, setLoadingMeta] = useState(true);
  const { roster, loaded, upsertMany, removePlayer } = useTournamentJerseys(tournamentId ?? null);

  const [players, setPlayers] = useState<DraftPlayer[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<DraftPlayer | null>(null);
  const [saving, setSaving] = useState(false);

  // Saved teams import
  const [savedTeamsOpen, setSavedTeamsOpen] = useState(false);
  const [loadingSavedTeams, setLoadingSavedTeams] = useState(false);
  const [savedTeams, setSavedTeams] = useState<SavedTeam[]>([]);
  const [importTarget, setImportTarget] = useState<SavedTeam | null>(null);

  const openSavedTeams = async () => {
    if (!user) {
      toast.error("Devi essere loggato per usare le squadre salvate");
      return;
    }
    setSavedTeamsOpen(true);
    setLoadingSavedTeams(true);
    try {
      const { data, error } = await supabase
        .from("saved_teams")
        .select("id, name, category, players")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      setSavedTeams((data || []).map(t => ({
        id: t.id,
        name: t.name,
        category: t.category || "",
        players: (t.players as unknown as { name: string; number: number | null }[]) || [],
      })));
    } catch (e) {
      console.error(e);
      toast.error("Errore nel caricamento delle squadre");
    } finally {
      setLoadingSavedTeams(false);
    }
  };

  const handlePickSavedTeam = (team: SavedTeam) => {
    setSavedTeamsOpen(false);
    if (players.some(p => p.name.trim() || p.number != null)) {
      setImportTarget(team);
    } else {
      applyImport(team);
    }
  };

  const applyImport = (team: SavedTeam) => {
    const usedNumbers = new Set<number>();
    const imported: DraftPlayer[] = team.players.map(tp => {
      let n = tp.number;
      if (n != null) {
        if (usedNumbers.has(n)) n = null;
        else usedNumbers.add(n);
      }
      return {
        id: crypto.randomUUID(),
        name: (tp.name || "").toUpperCase(),
        number: n,
        existed: false,
      };
    });
    setPlayers(imported);
    toast.success(`Squadra "${team.name}" caricata. Assegna/verifica i numeri di maglia.`);
  };

  const confirmReplace = () => {
    if (importTarget) applyImport(importTarget);
    setImportTarget(null);
  };


  // Load tournament metadata
  useEffect(() => {
    if (!user || !tournamentId) { setLoadingMeta(false); return; }
    (async () => {
      const { data, error } = await supabase
        .from("tournaments")
        .select("name")
        .eq("id", tournamentId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error || !data) {
        toast.error("Torneo non trovato");
        navigate("/tournaments");
        return;
      }
      setTournamentName(data.name);
      setLoadingMeta(false);
    })();
  }, [user, tournamentId, navigate]);

  // Hydrate draft from persisted roster (once jerseys loaded)
  useEffect(() => {
    if (!loaded) return;
    setPlayers(prev => {
      // If user already started editing, don't clobber
      if (prev.length > 0) return prev;
      return roster.map((r: RosterEntry) => ({
        id: r.id,
        name: r.name,
        number: r.number,
        existed: true,
      }));
    });
  }, [loaded, roster]);

  const addPlayer = () => {
    setPlayers(prev => [
      ...prev,
      { id: crypto.randomUUID(), name: "", number: null, existed: false },
    ]);
  };

  const updateName = (id: string, name: string) => {
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, name } : p));
  };

  const updateNumber = (id: string, raw: string) => {
    const n = raw.trim() === "" ? null : Math.max(0, Math.min(99, parseInt(raw, 10) || 0));
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, number: n } : p));
  };

  const requestDelete = (p: DraftPlayer) => setDeleteTarget(p);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    setPlayers(prev => prev.filter(p => p.id !== target.id));
    if (target.existed) {
      try { await removePlayer(target.id); } catch (e) {
        console.error(e);
        toast.error("Errore nella rimozione del giocatore");
      }
    }
  };

  const handleSave = async () => {
    // Validate
    const cleaned = players
      .map(p => ({ ...p, name: p.name.trim().toUpperCase() }))
      .filter(p => p.name.length > 0);

    // Duplicate name check
    const namesSeen = new Set<string>();
    for (const p of cleaned) {
      if (namesSeen.has(p.name)) {
        toast.error(`Nome duplicato: ${p.name}`);
        return;
      }
      namesSeen.add(p.name);
    }
    // Duplicate number check (only those with a number)
    const numsSeen = new Set<number>();
    for (const p of cleaned) {
      if (p.number == null) continue;
      if (numsSeen.has(p.number)) {
        toast.error(`Numero maglia duplicato: ${p.number}`);
        return;
      }
      numsSeen.add(p.number);
    }

    setSaving(true);
    try {
      // Persist only those with a valid number (others are excluded from the tournament).
      await upsertMany(
        cleaned
          .filter(p => typeof p.number === "number" && p.number !== null)
          .map(p => ({ id: p.id, name: p.name, number: p.number as number })),
      );

      // Remove DB rows for players whose number was cleared
      const toRemove = players.filter(p => p.existed && (p.number == null || p.name.trim() === ""));
      for (const p of toRemove) {
        await removePlayer(p.id);
      }

      // Refresh local draft state from cleaned set so existed flags update
      setPlayers(cleaned.map(p => ({
        id: p.id,
        name: p.name,
        number: p.number,
        existed: p.number != null,
      })));

      toast.success("Rosa del torneo salvata");
      navigate(`/tournament/${tournamentId}`);
    } catch (e: any) {
      console.error("[tournament-roster] save", e);
      toast.error("Errore nel salvataggio. Riprova.");
    } finally {
      setSaving(false);
    }
  };

  if (loadingMeta || !loaded) {
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

  const validCount = players.filter(p => p.name.trim() && p.number != null).length;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Rosa del Torneo | Match Manager Live</title>
        <meta
          name="description"
          content="Configura la rosa fissa della tua squadra per il torneo, con nomi e numeri di maglia persistenti."
        />
      </Helmet>
      <Header />
      <main className="flex-1 p-4 max-w-2xl mx-auto w-full pt-6">
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/tournament/${tournamentId}`)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold flex items-center gap-2 truncate">
              <Trophy className="h-6 w-6 text-yellow-500 shrink-0" />
              {tournamentName}
            </h1>
            <p className="text-sm text-muted-foreground">Rosa del Torneo</p>
          </div>
        </div>

        <Card className="p-4 mb-4 bg-muted/30">
          <div className="flex items-start gap-2">
            <Users className="h-4 w-4 mt-0.5 text-primary shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Definisci qui i giocatori della <strong>Mia Squadra</strong> e i loro numeri di maglia.
              Verranno precompilati automaticamente in ogni partita del torneo.
              I giocatori <strong>senza numero</strong> non parteciperanno al torneo e
              saranno esclusi dalle statistiche.
            </p>
          </div>
        </Card>

        <div className="space-y-2 mb-4">
          {players.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground text-sm">
                Nessun giocatore nella rosa. Aggiungi i giocatori della tua squadra.
              </p>
            </Card>
          ) : (
            players.map((p) => (
              <Card key={p.id} className="p-3 flex items-center gap-2">
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={99}
                  placeholder="#"
                  value={p.number ?? ""}
                  onChange={(e) => updateNumber(p.id, e.target.value)}
                  className="w-16 text-center font-bold tabular-nums"
                />
                <Input
                  placeholder="NOME GIOCATORE"
                  value={p.name}
                  onChange={(e) => updateName(p.id, e.target.value)}
                  className="flex-1 uppercase"
                  maxLength={50}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => requestDelete(p)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </Card>
            ))
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
          <Button variant="outline" className="w-full gap-2" onClick={addPlayer}>
            <Plus className="h-4 w-4" /> Aggiungi giocatore
          </Button>
          <Button variant="outline" className="w-full gap-2" onClick={openSavedTeams}>
            <Download className="h-4 w-4" /> Importa da Mia Squadra
          </Button>
        </div>


        <div className="sticky bottom-4 flex flex-col gap-2">
          <Button
            className="w-full gap-2"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salva Rosa ({validCount} giocatori attivi)
          </Button>
        </div>
      </main>
      <Footer />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rimuovere il giocatore?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.existed
                ? "Il giocatore verrà rimosso dalla rosa del torneo. Le statistiche già registrate nelle partite passate non verranno più conteggiate nei totali del torneo."
                : "Il giocatore verrà rimosso dalla bozza."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Rimuovi</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={savedTeamsOpen} onOpenChange={setSavedTeamsOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Le mie squadre salvate</DialogTitle>
            <DialogDescription>
              Scegli una squadra da importare nella rosa del torneo. Verranno copiati nomi e numeri di maglia.
            </DialogDescription>
          </DialogHeader>
          {loadingSavedTeams ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : savedTeams.length === 0 ? (
            <div className="py-6 text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                Non hai ancora squadre salvate.
              </p>
              <Button variant="outline" size="sm" onClick={() => { setSavedTeamsOpen(false); navigate("/my-teams"); }}>
                Vai a Mia Squadra
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {savedTeams.map(team => (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => handlePickSavedTeam(team)}
                  className="w-full text-left p-3 rounded-lg border border-input bg-card hover:bg-accent transition-colors"
                >
                  <div className="font-semibold">{team.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {team.category && <span>{team.category} · </span>}
                    {team.players.length} giocatori
                  </div>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!importTarget} onOpenChange={(open) => !open && setImportTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sostituire la rosa attuale?</AlertDialogTitle>
            <AlertDialogDescription>
              La bozza corrente verrà sostituita con i giocatori di "{importTarget?.name}". I dati già salvati nel torneo restano fino al prossimo salvataggio.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReplace}>Sostituisci</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
