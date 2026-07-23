import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FileText, Save, Users, ClipboardList, Loader2, ChevronRight, ArrowLeft, Download } from "lucide-react";
import type { MatchMetadata, LineupSelection } from "@/types/match";
import type { TeamMember } from "@/pages/TeamMembers";
import { buildLineupPdf, suggestedFilename } from "@/lib/lineupPdf";

interface Props {
  metadata: MatchMetadata;
  homeTeamName: string;
  awayTeamName: string;
  onMetadataChange: (patch: Partial<MatchMetadata>) => void;
  onHomeTeamNameChange: (name: string) => void;
  onAwayTeamNameChange: (name: string) => void;
  onSaveNow: () => void;
  onSetHomeRosterFromMembers: (players: Array<{ id: string; name: string; number: number | null }>) => void;
  onGoToRoster: () => void;
  isMatchStarted: boolean;
}

interface TeamRow { id: string; name: string; leva: string; category: string; }
type SubView = "form" | "chooser" | "prep";

const decodeCategory = (raw: string | null | undefined) => {
  const s = (raw || "").trim();
  if (!s) return { leva: "", category: "" };
  const parts = s.split("|").map(p => p.trim());
  if (parts.length >= 2) return { leva: parts[0], category: parts.slice(1).join(" | ") };
  return { leva: "", category: s };
};

const staffOptions = [
  "Dirigente accompagnatore ufficiale",
  "Allenatore",
  "Allenatore in seconda",
  "Massaggiatore",
];

export function MatchDetailsTab(props: Props) {
  const {
    metadata, homeTeamName, awayTeamName,
    onMetadataChange, onHomeTeamNameChange, onAwayTeamNameChange,
    onSaveNow, onSetHomeRosterFromMembers, onGoToRoster, isMatchStarted,
  } = props;
  const { user } = useAuth();

  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const view: SubView = metadata.detailsConfirmed
    ? (metadata.lineupSelection ? "prep" : "form")
    : "form";
  const [override, setOverride] = useState<SubView | null>(null);
  const effectiveView: SubView = override ?? view;

  // Load user's teams
  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoadingTeams(true);
      const { data } = await supabase
        .from("saved_teams")
        .select("id, name, category")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      const rows: TeamRow[] = (data || []).map((t: any) => {
        const { leva, category } = decodeCategory(t.category);
        return { id: t.id, name: t.name, leva, category };
      });
      setTeams(rows);
      setLoadingTeams(false);
    })();
  }, [user]);

  // Auto-fill Leva/Categoria/Nome squadra from selected team
  const applyTeamDefaults = (teamId: string) => {
    const t = teams.find(x => x.id === teamId);
    if (!t) return;
    onMetadataChange({ teamId, leva: metadata.leva || t.leva, category: metadata.category || t.category });
    if (!homeTeamName || homeTeamName === "Casa") onHomeTeamNameChange(t.name);
  };

  // Load members when a team is selected (for lineup prep)
  useEffect(() => {
    if (!user || !metadata.teamId) { setMembers([]); return; }
    (async () => {
      setLoadingMembers(true);
      const { data, error } = await supabase
        .from("team_members")
        .select("id, team_id, full_name, birth_date, figc_number, fiscal_code, role, jersey_number")
        .eq("user_id", user.id)
        .eq("team_id", metadata.teamId!)
        .order("role")
        .order("full_name");
      if (error) toast.error("Errore caricamento anagrafica");
      else setMembers((data || []) as TeamMember[]);
      setLoadingMembers(false);
    })();
  }, [user, metadata.teamId]);

  // ---------- FORM (Dati Gara) ----------
  const renderForm = () => (
    <Card className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Dati Gara per Distinta</h2>
          <p className="text-xs text-muted-foreground">Tutti i campi sono opzionali. Puoi proseguire lasciandoli vuoti.</p>
        </div>
        {metadata.detailsConfirmed && (
          <span className="text-xs text-emerald-600 font-medium">✓ Salvato</span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label>Anagrafica squadra</Label>
          <Select
            value={metadata.teamId || "_none"}
            onValueChange={(v) => v === "_none" ? onMetadataChange({ teamId: null }) : applyTeamDefaults(v)}
            disabled={loadingTeams}
          >
            <SelectTrigger><SelectValue placeholder="Seleziona…" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">— nessuna —</SelectItem>
              {teams.map(t => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}{t.category ? ` · ${t.category}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Torneo / Campionato</Label>
          <Input value={metadata.tournamentLabel} onChange={(e) => onMetadataChange({ tournamentLabel: e.target.value })} />
        </div>
        <div>
          <Label>Girone</Label>
          <Input value={metadata.groupName} onChange={(e) => onMetadataChange({ groupName: e.target.value })} />
        </div>
        <div>
          <Label>Leva</Label>
          <Input value={metadata.leva} onChange={(e) => onMetadataChange({ leva: e.target.value })} placeholder="es. 2014" />
        </div>
        <div>
          <Label>Categoria</Label>
          <Input value={metadata.category} onChange={(e) => onMetadataChange({ category: e.target.value })} placeholder="es. Pulcini" />
        </div>

        <div>
          <Label>Nome mia squadra</Label>
          <Input value={homeTeamName} onChange={(e) => onHomeTeamNameChange(e.target.value)} />
        </div>
        <div>
          <Label>Nome squadra avversaria</Label>
          <Input value={awayTeamName} onChange={(e) => onAwayTeamNameChange(e.target.value)} />
        </div>

        <div>
          <Label>Data partita</Label>
          <Input type="date" value={metadata.matchDate} onChange={(e) => onMetadataChange({ matchDate: e.target.value })} />
        </div>
        <div>
          <Label>Ora partita</Label>
          <Input type="time" value={metadata.matchTime} onChange={(e) => onMetadataChange({ matchTime: e.target.value })} />
        </div>

        <div className="sm:col-span-2">
          <Label>Luogo</Label>
          <Input value={metadata.venue} onChange={(e) => onMetadataChange({ venue: e.target.value })} placeholder="es. Via Prasca, Genova" />
        </div>

        <div className="sm:col-span-2 flex items-center gap-3 pt-2">
          <Switch
            checked={metadata.isHomeTeam}
            onCheckedChange={(v) => onMetadataChange({ isHomeTeam: v })}
            id="is-home"
          />
          <Label htmlFor="is-home" className="cursor-pointer">
            {metadata.isHomeTeam ? "In Casa" : "In Trasferta"}
          </Label>
          <span className="text-xs text-muted-foreground">
            (inverte l'ordine mia/avversaria nei report)
          </span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 pt-2">
        <Button
          onClick={() => {
            onMetadataChange({ detailsConfirmed: true });
            onSaveNow();
            toast.success("Dati gara salvati");
          }}
          className="gap-2"
        >
          <Save className="h-4 w-4" /> Salva Dati Gara
        </Button>
      </div>

      {metadata.detailsConfirmed && (
        <div className="border-t pt-4 space-y-3">
          <h3 className="font-semibold text-sm">Come vuoi proseguire?</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setOverride("chooser")}
              className="text-left p-4 rounded-lg border-2 border-primary/20 hover:border-primary hover:bg-primary/5 transition-all"
            >
              <div className="flex items-center gap-2 mb-1">
                <ClipboardList className="h-5 w-5 text-primary" />
                <span className="font-semibold">Prepara Distinta ufficiale</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Seleziona convocati dall'Anagrafica, genera il PDF e prosegui con la rosa pre-compilata.
              </p>
            </button>
            <button
              type="button"
              onClick={onGoToRoster}
              className="text-left p-4 rounded-lg border-2 border-secondary/20 hover:border-secondary hover:bg-secondary/5 transition-all"
            >
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-5 w-5 text-secondary" />
                <span className="font-semibold">Inserisci Rose</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Salta la distinta e vai direttamente alla compilazione delle rose.
              </p>
            </button>
          </div>
        </div>
      )}
    </Card>
  );

  // ---------- CHOOSER / PREP (Distinta) ----------
  const players = useMemo(() => members.filter(m => (m.role || "").toLowerCase() === "giocatore"), [members]);
  const staff = useMemo(() => members.filter(m => (m.role || "").toLowerCase() !== "giocatore"), [members]);

  const selection: LineupSelection = metadata.lineupSelection || { playerIds: [], captains: {}, staffRoles: {} };
  const selSet = new Set(selection.playerIds);

  const updateSelection = (patch: Partial<LineupSelection>) => {
    const next: LineupSelection = {
      playerIds: patch.playerIds ?? selection.playerIds,
      captains: patch.captains ?? selection.captains,
      staffRoles: patch.staffRoles ?? selection.staffRoles,
    };
    onMetadataChange({ lineupSelection: next });
  };

  const togglePlayer = (id: string) => {
    if (selSet.has(id)) {
      const next = selection.playerIds.filter(x => x !== id);
      const { [id]: _, ...restCaptains } = selection.captains;
      updateSelection({ playerIds: next, captains: restCaptains });
    } else {
      updateSelection({ playerIds: [...selection.playerIds, id] });
    }
  };

  const setCaptain = (id: string, mark: "" | "C" | "VC") => {
    const next = { ...selection.captains };
    if (mark === "C") for (const k of Object.keys(next)) if (next[k] === "C") delete next[k];
    if (mark === "VC") for (const k of Object.keys(next)) if (next[k] === "VC") delete next[k];
    if (mark === "") delete next[id]; else next[id] = mark;
    updateSelection({ captains: next });
  };

  const setStaffRole = (id: string, slot: string | null) => {
    const next = { ...selection.staffRoles };
    if (!slot) delete next[id];
    else {
      for (const k of Object.keys(next)) if (next[k] === slot) delete next[k];
      next[id] = slot;
    }
    updateSelection({ staffRoles: next });
  };

  const downloadPdf = () => {
    if (selection.playerIds.length === 0) return toast.error("Seleziona almeno un giocatore");
    const doc = buildLineupPdf({
      members,
      selection,
      metadata,
      homeTeamName,
      awayTeamName,
    });
    doc.save(suggestedFilename(metadata, homeTeamName, awayTeamName));
    toast.success("Distinta generata");
  };

  const saveAndProceed = () => {
    if (selection.playerIds.length === 0) return toast.error("Seleziona almeno un giocatore");
    // Pre-populate home roster with selected players (preserve member id → stable across match)
    const selectedPlayers = players
      .filter(p => selSet.has(p.id))
      .sort((a, b) => a.full_name.localeCompare(b.full_name, "it"))
      .map(p => ({ id: p.id, name: p.full_name, number: p.jersey_number }));
    onSetHomeRosterFromMembers(selectedPlayers);
    onSaveNow();
    toast.success("Distinta salvata — rosa pre-compilata");
    onGoToRoster();
  };

  const renderPrep = () => (
    <Card className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Distinta ufficiale</h2>
          <p className="text-xs text-muted-foreground">
            Seleziona i convocati dall'anagrafica{metadata.teamId ? "" : " (seleziona prima una squadra nei Dati Gara)"}.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setOverride("form")} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Dati Gara
        </Button>
      </div>

      {!metadata.teamId ? (
        <div className="text-center py-6 text-sm text-muted-foreground">
          Nessuna anagrafica selezionata. Torna a <button className="underline" onClick={() => setOverride("form")}>Dati Gara</button> e scegli una squadra.
        </div>
      ) : loadingMembers ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : members.length === 0 ? (
        <div className="text-center py-6 text-sm text-muted-foreground">
          Nessun membro in questa anagrafica.
        </div>
      ) : (
        <>
          {/* Giocatori */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm">Giocatori ({selection.playerIds.length}/{players.length})</h3>
            </div>
            <div className="border rounded-md divide-y max-h-80 overflow-y-auto">
              {players.length === 0 && <p className="p-3 text-xs text-muted-foreground">Nessun giocatore.</p>}
              {players.map(p => {
                const isSel = selSet.has(p.id);
                return (
                  <div key={p.id} className="flex items-center gap-2 p-2 text-sm">
                    <Checkbox checked={isSel} onCheckedChange={() => togglePlayer(p.id)} />
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">{p.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.birth_date ? new Date(p.birth_date).toLocaleDateString("it-IT") : "—"} · Matr. {p.figc_number || "—"}
                        {p.jersey_number != null ? ` · N.${p.jersey_number}` : ""}
                      </p>
                    </div>
                    {isSel && (
                      <Select value={selection.captains[p.id] || "_none"} onValueChange={(v) => setCaptain(p.id, v === "_none" ? "" : v as any)}>
                        <SelectTrigger className="w-24 h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">—</SelectItem>
                          <SelectItem value="C">Capitano</SelectItem>
                          <SelectItem value="VC">Vice</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Staff */}
          <div>
            <h3 className="font-semibold text-sm mb-2">Staff (Allenatori & Dirigenti)</h3>
            <div className="border rounded-md divide-y max-h-60 overflow-y-auto">
              {staff.length === 0 && <p className="p-3 text-xs text-muted-foreground">Nessun membro staff.</p>}
              {staff.map(s => (
                <div key={s.id} className="flex items-center gap-2 p-2 text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium">{s.full_name}</p>
                    <p className="text-xs text-muted-foreground">{s.role} · Tess. {s.figc_number || "—"}</p>
                  </div>
                  <Select
                    value={selection.staffRoles[s.id] || "_none"}
                    onValueChange={(v) => setStaffRole(s.id, v === "_none" ? null : v)}
                  >
                    <SelectTrigger className="w-56 h-8 text-xs"><SelectValue placeholder="Assegna slot" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">— non convocato</SelectItem>
                      {staffOptions.map(opt => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
            <Button variant="outline" onClick={downloadPdf} className="gap-2">
              <Download className="h-4 w-4" /> Scarica PDF
            </Button>
            <Button variant="secondary" onClick={onSaveNow} className="gap-2">
              <Save className="h-4 w-4" /> Salva
            </Button>
            <Button onClick={saveAndProceed} className="gap-2 sm:ml-auto" disabled={isMatchStarted}>
              Salva e prosegui alle Rose <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          {isMatchStarted && (
            <p className="text-xs text-muted-foreground">La partita è già iniziata: non si può ripopolare la rosa.</p>
          )}
        </>
      )}
    </Card>
  );

  return effectiveView === "form" || effectiveView === "chooser" && !metadata.detailsConfirmed
    ? renderForm()
    : renderPrep();
}
