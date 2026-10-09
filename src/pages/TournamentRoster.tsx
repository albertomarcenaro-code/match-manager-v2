import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Users, Plus, Trash2, ChevronLeft, Loader2, Save, Trophy, Download, CheckSquare, Square, FileText,
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
import { buildLineupPdf } from "@/lib/lineupPdf";
import { fetchTeamProfile, getLogoDataUrl } from "@/lib/teamProfile";
import type { TeamMember } from "@/pages/TeamMembers";
import type { MatchMetadata } from "@/types/match";

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
  selected: boolean; // convocato per il torneo
  existed: boolean; // was loaded from DB
}

interface StaffDraft {
  id: string;
  name: string;
  role: string;
  figc: string;
  selected: boolean;
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
        selected: false, // spunte inizialmente DESELEZIONATE all'importazione
        existed: false,
      };
    });
    setPlayers(imported);
    toast.success(`Squadra "${team.name}" caricata. Spunta i giocatori da convocare per il torneo.`);
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
        selected: true,
        existed: true,
      }));
    });
  }, [loaded, roster]);

  // ---- Staff (allenatori/dirigenti) per la distinta del torneo ----
  const staffKey = `tournament-staff:${tournamentId}`;
  const [staff, setStaff] = useState<StaffDraft[]>([]);
  const [staffReady, setStaffReady] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<StaffDraft | null>(null);

  useEffect(() => {
    if (!user || !tournamentId) return;
    let cancelled = false;
    (async () => {
      let saved: StaffDraft[] | null = null;
      try { const raw = localStorage.getItem(staffKey); if (raw) saved = JSON.parse(raw); } catch { /* ignore */ }
      const { data } = await supabase
        .from("team_members")
        .select("id, full_name, role, figc_number")
        .eq("user_id", user.id);
      if (cancelled) return;
      const list: StaffDraft[] = saved ? [...saved] : [];
      const known = new Set(list.map(s => s.name.trim().toLowerCase()));
      for (const m of data || []) {
        if ((m.role || "").toLowerCase() === "giocatore") continue;
        const k = m.full_name.trim().toLowerCase();
        if (known.has(k)) continue;
        known.add(k);
        list.push({ id: m.id, name: m.full_name, role: m.role || "", figc: m.figc_number || "", selected: false });
      }
      setStaff(list);
      setStaffReady(true);
    })();
    return () => { cancelled = true; };
  }, [user, tournamentId, staffKey]);

  useEffect(() => {
    if (!staffReady) return;
    try { localStorage.setItem(staffKey, JSON.stringify(staff)); } catch { /* ignore */ }
  }, [staff, staffReady, staffKey]);

  const updateStaff = (id: string, patch: Partial<StaffDraft>) =>
    setStaff(prev => prev.map(s => (s.id === id ? { ...s, ...patch } : s)));
  const addStaff = () =>
    setStaff(prev => [...prev, { id: crypto.randomUUID(), name: "", role: "Allenatore", figc: "", selected: true }]);


  const addPlayer = () => {
    setPlayers(prev => [
      ...prev,
      { id: crypto.randomUUID(), name: "", number: null, selected: true, existed: false },
    ]);
  };

  const updateName = (id: string, name: string) => {
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, name } : p));
  };

  const updateNumber = (id: string, raw: string) => {
    const n = raw.trim() === "" ? null : Math.max(0, Math.min(99, parseInt(raw, 10) || 0));
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, number: n } : p));
  };

  const toggleSelected = (id: string) => {
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, selected: !p.selected } : p));
  };

  const selectAll = () => setPlayers(prev => prev.map(p => ({ ...p, selected: true })));
  const deselectAll = () => setPlayers(prev => prev.map(p => ({ ...p, selected: false })));

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

  const printDistinta = async () => {
    const selected = players.filter(p => p.selected && p.name.trim().length > 0);
    if (selected.length === 0) {
      toast.error("Seleziona almeno un giocatore da stampare");
      return;
    }
    if (!user) return;

    try {
      // Anagrafica societaria: squadra salvata più recente (logo, dati fiscali, ecc.)
      const { data: teams } = await supabase
        .from("saved_teams")
        .select("id")
        .order("updated_at", { ascending: false })
        .limit(1);
      const teamId = teams?.[0]?.id ?? null;
      const teamProfile = teamId ? await fetchTeamProfile(teamId) : null;
      const logoDataUrl = teamProfile?.logo_url ? await getLogoDataUrl(teamProfile.logo_url) : null;

      // Anagrafica membri per arricchire la distinta (nascita, matricola, staff)
      const { data: memberRows } = await supabase
        .from("team_members")
        .select("id, full_name, birth_date, figc_number, fiscal_code, role, jersey_number")
        .eq("user_id", user.id);
      const dbMembers = (memberRows || []) as TeamMember[];
      const byName = new Map(dbMembers.map(m => [m.full_name.trim().toLowerCase(), m]));

      // Ogni convocato diventa un membro: quello dell'anagrafica se esiste,
      // altrimenti sintetico. Il numero di maglia è quello del torneo.
      const members: TeamMember[] = [
        ...selected.map(p => {
          const found = byName.get(p.name.trim().toLowerCase());
          const base: TeamMember = found
            ? { ...found }
            : ({
                id: p.id,
                full_name: p.name,
                role: "giocatore",
                birth_date: null,
                figc_number: null,
                fiscal_code: null,
                jersey_number: null,
              } as unknown as TeamMember);
          return { ...base, id: p.id, jersey_number: p.number ?? base.jersey_number ?? null };
        }),
      ];

      const metadata: MatchMetadata = {
        tournamentLabel: tournamentName,
        groupName: "",
        leva: "",
        category: "",
        matchDate: "",
        matchTime: "",
        venue: "",
        isHomeTeam: true,
        teamId,
        lineupSelection: null,
        detailsConfirmed: true,
      };

      const doc = buildLineupPdf({
        members,
        selection: { playerIds: selected.map(p => p.id), captains: {}, staffRoles: {} },
        metadata,
        homeTeamName: teamProfile?.name || "",
        awayTeamName: "",
        teamProfile,
        logoDataUrl,
        staffList: staff
          .filter(s => s.selected && s.name.trim())
          .map(s => ({ role: s.role.trim(), name: s.name.trim(), figc: s.figc.trim() })),
      });

      const filename = `distinta_${(tournamentName || "torneo").replace(/[^a-z0-9]+/gi, "_")}.pdf`.toLowerCase();
      doc.save(filename);
      toast.success("Distinta generata");
    } catch (e) {
      console.error("[tournament-roster] printDistinta", e);
      toast.error("Errore nella generazione della distinta");
    }
  };

  const handleSave = async () => {
    // Validate
    const cleaned = players
      .map(p => ({ ...p, name: p.name.trim().toUpperCase() }))
      .filter(p => p.name.length > 0 || p.selected);

    const selected = cleaned.filter(p => p.selected && p.name.length > 0);

    // Duplicate name check (among selected)
    const namesSeen = new Set<string>();
    for (const p of selected) {
      if (namesSeen.has(p.name)) {
        toast.error(`Nome duplicato: ${p.name}`);
        return;
      }
      namesSeen.add(p.name);
    }
    // Duplicate number check (only selected players with a number)
    const numsSeen = new Set<number>();
    for (const p of selected) {
      if (p.number == null) continue;
      if (numsSeen.has(p.number)) {
        toast.error(`Numero maglia duplicato: ${p.number}`);
        return;
      }
      numsSeen.add(p.number);
    }

    setSaving(true);
    try {
      // Persist all selected players (number optional — fixed for the whole tournament once set)
      await upsertMany(
        selected.map(p => ({ id: p.id, name: p.name, number: p.number })),
      );

      // Remove DB rows for players that were unselected or emptied
      const selectedIds = new Set(selected.map(p => p.id));
      const toRemove = players.filter(p => p.existed && !selectedIds.has(p.id));
      for (const p of toRemove) {
        await removePlayer(p.id);
      }

      // Refresh local draft state so existed flags update
      setPlayers(cleaned.map(p => ({
        id: p.id,
        name: p.name,
        number: p.number,
        selected: p.selected && p.name.length > 0,
        existed: p.selected && p.name.length > 0,
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

  const selectedCount = players.filter(p => p.selected && p.name.trim()).length;
  const numberedCount = players.filter(p => p.selected && p.name.trim() && p.number != null).length;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Rosa del Torneo | Match Manager Live</title>
        <meta
          name="description"
          content="Seleziona i convocati del torneo e assegna i numeri di maglia fissi, riproposti automaticamente in ogni partita."
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
              <strong>Spunta</strong> i giocatori convocati per il torneo. I numeri di maglia sono facoltativi in questa
              fase, ma diventano <strong>obbligatori alla prima partita</strong>: da quel momento restano
              <strong> fissi per l'intero torneo</strong> e vengono riproposti automaticamente in ogni partita successiva.
            </p>
          </div>
        </Card>

        {players.length > 0 && (
          <div className="flex gap-2 mb-3">
            <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={selectAll}>
              <CheckSquare className="h-4 w-4" /> Seleziona Tutti
            </Button>
            <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={deselectAll}>
              <Square className="h-4 w-4" /> Deseleziona Tutti
            </Button>
          </div>
        )}

        <div className="space-y-2 mb-4">
          {players.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground text-sm">
                Nessun giocatore nella rosa. Aggiungi i giocatori della tua squadra.
              </p>
            </Card>
          ) : (
            [...players].sort((a, b) => {
              const an = a.name.trim(), bn = b.name.trim();
              if (!an && !bn) return 0;
              if (!an) return 1;
              if (!bn) return -1;
              return an.localeCompare(bn, "it");
            }).map((p) => (
              <Card key={p.id} className={`p-3 flex items-center gap-2 ${p.selected ? "" : "opacity-60"}`}>
                <Checkbox
                  checked={p.selected}
                  onCheckedChange={() => toggleSelected(p.id)}
                  aria-label={`Convoca ${p.name || "giocatore"}`}
                  className="shrink-0"
                />
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={99}
                  placeholder="#"
                  value={p.number ?? ""}
                  onChange={(e) => updateNumber(p.id, e.target.value)}
                  disabled={!p.selected}
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

        <h2 className="text-lg font-bold mb-2">Allenatori e Dirigenti</h2>
        <div className="space-y-2 mb-3">
          {staff.length === 0 ? (
            <Card className="p-4 text-center">
              <p className="text-muted-foreground text-sm">Nessun membro dello staff. Aggiungili qui o nell'anagrafica squadra.</p>
            </Card>
          ) : (
            staff.map(s => (
              <Card key={s.id} className={`p-3 flex flex-wrap items-center gap-2 ${s.selected ? "" : "opacity-60"}`}>
                <Checkbox checked={s.selected} onCheckedChange={() => updateStaff(s.id, { selected: !s.selected })} aria-label={`Seleziona ${s.name || "staff"}`} />
                <Input placeholder="RUOLO" value={s.role} onChange={e => updateStaff(s.id, { role: e.target.value })} className="w-40" maxLength={50} />
                <Input placeholder="COGNOME NOME" value={s.name} onChange={e => updateStaff(s.id, { name: e.target.value })} className="flex-1 min-w-[140px] uppercase" maxLength={100} />
                <Input placeholder="Tessera" value={s.figc} onChange={e => updateStaff(s.id, { figc: e.target.value })} className="w-28" maxLength={30} />
                <Button size="icon" variant="ghost" className="h-9 w-9 text-muted-foreground hover:text-destructive" onClick={() => setStaffToDelete(s)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </Card>
            ))
          )}
        </div>
        <Button variant="outline" className="w-full gap-2 mb-6" onClick={addStaff}>
          <Plus className="h-4 w-4" /> Aggiungi allenatore / dirigente
        </Button>

        <AlertDialog open={!!staffToDelete} onOpenChange={o => !o && setStaffToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Rimuovere {staffToDelete?.name || "questo membro"}?</AlertDialogTitle>
              <AlertDialogDescription>Verrà tolto solo dalla distinta di questo torneo.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annulla</AlertDialogCancel>
              <AlertDialogAction onClick={() => { if (staffToDelete) setStaff(prev => prev.filter(x => x.id !== staffToDelete.id)); setStaffToDelete(null); }}>Rimuovi</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>


        <div className="sticky bottom-4 flex flex-col gap-2">
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={printDistinta}
            disabled={selectedCount === 0}
          >
            <FileText className="h-4 w-4" /> Stampa Distinta ({selectedCount} convocati)
          </Button>
          <Button
            className="w-full gap-2"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salva Rosa ({selectedCount} convocati · {numberedCount} con numero)
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
              Scegli una squadra da importare nella rosa del torneo. I giocatori verranno caricati con le spunte deselezionate: spunta chi vuoi convocare.
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
