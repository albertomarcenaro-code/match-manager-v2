import React, { useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet";
import { useNavigate, useSearchParams } from "react-router-dom";
import * as XLSX from "xlsx";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ChevronLeft, Upload, Plus, Trash2, Loader2, Pencil, IdCard,
  Download, Users, ArrowLeft,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Json } from "@/integrations/supabase/types";

const ROLES = ["Giocatore", "Allenatore", "Dirigente", "Massaggiatore"];

export interface TeamMember {
  id: string;
  team_id: string;
  full_name: string;
  birth_date: string | null;
  figc_number: string | null;
  fiscal_code: string | null;
  role: string;
  jersey_number: number | null;
}

interface TeamRow {
  id: string;
  name: string;
  category: string;
  leva: string;
  memberCount: number;
}

const emptyMember: Omit<TeamMember, "id" | "team_id"> = {
  full_name: "",
  birth_date: "",
  figc_number: "",
  fiscal_code: "",
  role: "Giocatore",
  jersey_number: null,
};

// saved_teams.category stores "Leva | Categoria" — encode/decode helpers
const encodeCategory = (leva: string, category: string) => {
  const l = leva.trim();
  const c = category.trim();
  if (l && c) return `${l} | ${c}`;
  return l || c || "";
};
const decodeCategory = (raw: string | null | undefined): { leva: string; category: string } => {
  const s = (raw || "").trim();
  if (!s) return { leva: "", category: "" };
  const parts = s.split("|").map(p => p.trim());
  if (parts.length >= 2) return { leva: parts[0], category: parts.slice(1).join(" | ") };
  return { leva: "", category: s };
};

const syncSavedTeamPlayers = async (teamId: string) => {
  const { data } = await supabase
    .from("team_members")
    .select("full_name, jersey_number, role")
    .eq("team_id", teamId);
  const players = (data || [])
    .filter((m: any) => (m.role || "").toLowerCase() === "giocatore")
    .map((m: any) => ({ name: (m.full_name || "").toUpperCase(), number: m.jersey_number ?? null }));
  await supabase
    .from("saved_teams")
    .update({ players: players as unknown as Json })
    .eq("id", teamId);
};

export default function TeamMembers() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(searchParams.get("teamId"));
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [importing, setImporting] = useState(false);

  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<TeamRow | null>(null);
  const [teamForm, setTeamForm] = useState({ name: "", leva: "", category: "" });

  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [memberForm, setMemberForm] = useState<Omit<TeamMember, "id" | "team_id">>(emptyMember);

  const [deleteTeam, setDeleteTeam] = useState<TeamRow | null>(null);
  const [deleteMember, setDeleteMember] = useState<TeamMember | null>(null);

  const selectedTeam = useMemo(
    () => teams.find(t => t.id === selectedTeamId) || null,
    [teams, selectedTeamId]
  );

  useEffect(() => { if (user) loadTeams(); }, [user]);
  useEffect(() => {
    if (selectedTeamId) {
      loadMembers(selectedTeamId);
      setSearchParams({ teamId: selectedTeamId });
    } else {
      setMembers([]);
      setSearchParams({});
    }
  }, [selectedTeamId]);

  const loadTeams = async () => {
    if (!user) return;
    setLoadingTeams(true);
    const { data: teamsData, error } = await supabase
      .from("saved_teams")
      .select("id, name, category")
      .order("updated_at", { ascending: false });
    if (error) { toast.error("Errore nel caricamento squadre"); setLoadingTeams(false); return; }
    const { data: countsData } = await supabase
      .from("team_members")
      .select("team_id")
      .eq("user_id", user.id);
    const counts = new Map<string, number>();
    (countsData || []).forEach((r: any) => counts.set(r.team_id, (counts.get(r.team_id) || 0) + 1));
    setTeams((teamsData || []).map((t: any) => {
      const { leva, category } = decodeCategory(t.category);
      return { id: t.id, name: t.name, leva, category, memberCount: counts.get(t.id) || 0 };
    }));
    setLoadingTeams(false);
  };

  const loadMembers = async (teamId: string) => {
    setLoadingMembers(true);
    const { data, error } = await supabase
      .from("team_members")
      .select("id, team_id, full_name, birth_date, figc_number, fiscal_code, role, jersey_number")
      .eq("team_id", teamId)
      .order("role")
      .order("full_name");
    if (error) toast.error("Errore nel caricamento membri");
    else setMembers((data || []) as TeamMember[]);
    setLoadingMembers(false);
  };

  // ---------- Teams CRUD ----------
  const openCreateTeam = () => {
    setEditingTeam(null);
    setTeamForm({ name: "", leva: "", category: "" });
    setTeamDialogOpen(true);
  };
  const openEditTeam = (t: TeamRow) => {
    setEditingTeam(t);
    setTeamForm({ name: t.name, leva: t.leva, category: t.category });
    setTeamDialogOpen(true);
  };
  const saveTeam = async () => {
    if (!user) return;
    const name = teamForm.name.trim();
    if (!name) return toast.error("Nome squadra obbligatorio");
    const payload = { name, category: encodeCategory(teamForm.leva, teamForm.category) };
    if (editingTeam) {
      const { error } = await supabase.from("saved_teams").update(payload).eq("id", editingTeam.id);
      if (error) return toast.error("Errore nel salvataggio");
    } else {
      const { data, error } = await supabase
        .from("saved_teams")
        .insert({ user_id: user.id, players: [] as unknown as Json, ...payload })
        .select("id").single();
      if (error) return toast.error("Errore nel salvataggio");
      if (data?.id) setSelectedTeamId(data.id);
    }
    toast.success("Squadra salvata");
    setTeamDialogOpen(false);
    loadTeams();
  };
  const confirmDeleteTeam = async () => {
    if (!deleteTeam) return;
    const { error } = await supabase.from("saved_teams").delete().eq("id", deleteTeam.id);
    if (error) toast.error("Errore");
    else {
      toast.success("Squadra eliminata");
      if (selectedTeamId === deleteTeam.id) setSelectedTeamId(null);
      loadTeams();
    }
    setDeleteTeam(null);
  };

  // ---------- Members CRUD ----------
  const openAddMember = () => {
    setEditingMemberId(null);
    setMemberForm(emptyMember);
    setMemberDialogOpen(true);
  };
  const openEditMember = (m: TeamMember) => {
    setEditingMemberId(m.id);
    setMemberForm({
      full_name: m.full_name,
      birth_date: m.birth_date || "",
      figc_number: m.figc_number || "",
      fiscal_code: m.fiscal_code || "",
      role: m.role,
      jersey_number: m.jersey_number,
    });
    setMemberDialogOpen(true);
  };
  const saveMember = async () => {
    if (!user || !selectedTeamId) return;
    const full_name = memberForm.full_name.trim();
    if (!full_name) return toast.error("Nome obbligatorio");
    const payload = {
      user_id: user.id,
      team_id: selectedTeamId,
      full_name,
      birth_date: memberForm.birth_date || null,
      figc_number: memberForm.figc_number?.trim() || null,
      fiscal_code: memberForm.fiscal_code?.trim().toUpperCase() || null,
      role: memberForm.role || "Giocatore",
      jersey_number: memberForm.jersey_number ?? null,
    };
    const { error } = editingMemberId
      ? await supabase.from("team_members").update(payload).eq("id", editingMemberId).eq("user_id", user.id)
      : await supabase.from("team_members").insert(payload);
    if (error) return toast.error("Errore nel salvataggio");
    await syncSavedTeamPlayers(selectedTeamId);
    toast.success("Membro salvato");
    setMemberDialogOpen(false);
    loadMembers(selectedTeamId);
    loadTeams();
  };
  const confirmDeleteMember = async () => {
    if (!user || !deleteMember || !selectedTeamId) return;
    const { error } = await supabase
      .from("team_members").delete().eq("id", deleteMember.id).eq("user_id", user.id);
    if (error) toast.error("Errore");
    else {
      await syncSavedTeamPlayers(selectedTeamId);
      setMembers(prev => prev.filter(m => m.id !== deleteMember.id));
      toast.success("Membro eliminato");
      loadTeams();
    }
    setDeleteMember(null);
  };

  // In-place edit: update single field
  const updateCell = async (m: TeamMember, patch: Partial<TeamMember>) => {
    setMembers(prev => prev.map(x => x.id === m.id ? { ...x, ...patch } : x));
    const payload: any = {};
    if ("full_name" in patch) payload.full_name = (patch.full_name || "").trim();
    if ("figc_number" in patch) payload.figc_number = (patch.figc_number || "").toString().trim() || null;
    if ("fiscal_code" in patch) payload.fiscal_code = (patch.fiscal_code || "").toString().trim().toUpperCase() || null;
    if ("birth_date" in patch) payload.birth_date = patch.birth_date || null;
    if ("role" in patch) payload.role = patch.role || "Giocatore";
    if ("jersey_number" in patch) payload.jersey_number = patch.jersey_number ?? null;
    const { error } = await supabase.from("team_members").update(payload).eq("id", m.id);
    if (error) { toast.error("Errore salvataggio"); loadMembers(selectedTeamId!); return; }
    if (selectedTeamId) await syncSavedTeamPlayers(selectedTeamId);
  };

  // ---------- Excel template ----------
  const downloadTemplate = () => {
    const headers = [
      ["Cognome Nome", "Data di nascita", "N. Matricola FIGC", "Codice Fiscale", "Qualifica", "N. Maglia"],
      ["ROSSI MARIO", "15/03/2010", "1234567", "RSSMRA10C15H501Z", "Giocatore", "10"],
      ["BIANCHI LUCA", "22/07/1985", "", "", "Allenatore", ""],
    ];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    ws["!cols"] = [{ wch: 28 }, { wch: 14 }, { wch: 18 }, { wch: 20 }, { wch: 16 }, { wch: 10 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Anagrafica");
    XLSX.writeFile(wb, "template_anagrafica_squadra.xlsx");
    toast.success("Template scaricato");
  };

  // ---------- Excel import ----------
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !selectedTeamId) return;
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { cellDates: true });
      const rows: any[] = [];
      for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        rows.push(...(XLSX.utils.sheet_to_json(ws, { defval: null, raw: false }) as any[]));
      }

      const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "").replace(/[.]/g, "");
      const pick = (r: any, keys: string[]) => {
        for (const k of Object.keys(r)) if (keys.includes(norm(k))) return r[k];
        return null;
      };
      const parseDate = (v: any): string | null => {
        if (!v) return null;
        if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString().slice(0, 10);
        const s = String(v).trim();
        if (!s || s === ".") return null;
        const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
        if (m) {
          const d = m[1].padStart(2, "0");
          const mo = m[2].padStart(2, "0");
          let y = m[3];
          if (y.length === 2) y = (parseInt(y) > 30 ? "19" : "20") + y;
          return `${y}-${mo}-${d}`;
        }
        const d = new Date(s);
        return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
      };
      const parseInt2 = (v: any): number | null => {
        if (v == null || v === "") return null;
        const n = parseInt(String(v).trim(), 10);
        return Number.isFinite(n) ? n : null;
      };

      const payload = rows.map((r) => {
        const name = pick(r, ["cognomenome", "cognomeenome", "nome", "nominativo"]);
        if (!name) return null;
        const role = String(pick(r, ["qualifica", "ruolo"]) || "Giocatore").trim();
        return {
          user_id: user.id,
          team_id: selectedTeamId,
          full_name: String(name).trim(),
          birth_date: parseDate(pick(r, ["datadinascita", "datanascita"])),
          figc_number: (() => {
            const v = pick(r, ["nmatricolafigc", "matricolafigc", "matricola", "nmatricola"]);
            return v ? String(v).trim() : null;
          })(),
          fiscal_code: (() => {
            const v = pick(r, ["codicefiscale", "cf"]);
            return v ? String(v).trim().toUpperCase() : null;
          })(),
          role: role || "Giocatore",
          jersey_number: parseInt2(pick(r, ["nmaglia", "maglia", "numero", "n"])),
        };
      }).filter(Boolean) as any[];

      if (payload.length === 0) { toast.error("Nessun record valido nel file"); return; }

      const withFiscal = payload.filter(p => p.fiscal_code);
      const withoutFiscal = payload.filter(p => !p.fiscal_code);

      let ok = 0;
      if (withFiscal.length) {
        const { error } = await supabase
          .from("team_members")
          .upsert(withFiscal, { onConflict: "team_id,fiscal_code" });
        if (error) throw error;
        ok += withFiscal.length;
      }
      if (withoutFiscal.length) {
        const { data: existing } = await supabase
          .from("team_members")
          .select("id, full_name")
          .eq("team_id", selectedTeamId);
        const existingMap = new Map<string, string>(
          (existing || []).map((e: any) => [e.full_name.toLowerCase().trim(), e.id])
        );
        for (const p of withoutFiscal) {
          const key = p.full_name.toLowerCase().trim();
          if (existingMap.has(key)) {
            await supabase.from("team_members").update(p).eq("id", existingMap.get(key)!);
          } else {
            await supabase.from("team_members").insert(p);
          }
          ok += 1;
        }
      }

      await syncSavedTeamPlayers(selectedTeamId);
      toast.success(`Importati/aggiornati ${ok} membri`);
      loadMembers(selectedTeamId);
      loadTeams();
    } catch (err: any) {
      console.error("Import error:", err);
      toast.error("Errore durante l'importazione del file");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  // ---------- Render ----------
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>{selectedTeam ? `${selectedTeam.name} — Anagrafica` : "Anagrafica Squadra"} | Match Manager Live</title>
        <meta name="description" content="Gestisci le anagrafiche delle tue squadre: giocatori, allenatori e staff con dati federali per la distinta gara." />
      </Helmet>
      <Header />
      <main className="flex-1 p-4 max-w-5xl mx-auto w-full pt-6">
        {!selectedTeam ? (
          <>
            <div className="flex items-center gap-3 mb-6">
              <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold flex items-center gap-2 truncate">
                  <IdCard className="h-6 w-6 text-primary shrink-0" />
                  Anagrafica Squadra
                </h1>
                <p className="text-xs text-muted-foreground">
                  Crea e gestisci le rose delle tue squadre. Punto unico di data entry.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 mb-6">
              <Button onClick={openCreateTeam} className="gap-2 flex-1">
                <Plus className="h-4 w-4" /> Nuova Squadra
              </Button>
              <Button variant="outline" onClick={downloadTemplate} className="gap-2 flex-1">
                <Download className="h-4 w-4" /> Scarica Template Excel
              </Button>
            </div>

            {loadingTeams ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : teams.length === 0 ? (
              <Card className="p-8 text-center">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-muted-foreground text-sm">Nessuna squadra. Creane una per iniziare a inserire giocatori e staff.</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {teams.map(t => (
                  <Card key={t.id} className="p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <button
                        className="flex-1 text-left min-w-0"
                        onClick={() => setSelectedTeamId(t.id)}
                      >
                        <div className="font-bold truncate">{t.name}</div>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {t.leva && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{t.leva}</span>}
                          {t.category && <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{t.category}</span>}
                          <span className="text-xs text-muted-foreground">{t.memberCount} membri</span>
                        </div>
                      </button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditTeam(t)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon" variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteTeam(t)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-4">
              <Button variant="ghost" size="icon" onClick={() => setSelectedTeamId(null)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold truncate">{selectedTeam.name}</h1>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {selectedTeam.leva && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{selectedTeam.leva}</span>}
                  {selectedTeam.category && <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{selectedTeam.category}</span>}
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => openEditTeam(selectedTeam)}>
                <Pencil className="h-3.5 w-3.5 mr-1" /> Squadra
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <Button onClick={openAddMember} className="gap-2 flex-1">
                <Plus className="h-4 w-4" /> Aggiungi Membro
              </Button>
              <Button variant="outline" className="gap-2 flex-1" onClick={() => fileRef.current?.click()} disabled={importing}>
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Importa Excel
              </Button>
              <Button variant="outline" onClick={downloadTemplate} className="gap-2">
                <Download className="h-4 w-4" /> Template
              </Button>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
            </div>

            {loadingMembers ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : members.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground text-sm">Nessun membro. Aggiungi manualmente o importa un file Excel.</p>
              </Card>
            ) : (
              <Card className="p-2 sm:p-4 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-14">#</TableHead>
                      <TableHead>Cognome Nome</TableHead>
                      <TableHead className="w-36">Qualifica</TableHead>
                      <TableHead className="hidden sm:table-cell w-32">Nascita</TableHead>
                      <TableHead className="hidden md:table-cell w-28">Matricola</TableHead>
                      <TableHead className="hidden md:table-cell w-40">Cod. Fiscale</TableHead>
                      <TableHead className="w-20 text-right">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map(m => (
                      <TableRow key={m.id}>
                        <TableCell>
                          <Input
                            type="number" min={0} max={99}
                            className="h-8 w-14 tabular-nums"
                            value={m.jersey_number ?? ""}
                            onChange={e => setMembers(prev => prev.map(x => x.id === m.id ? { ...x, jersey_number: e.target.value === "" ? null : parseInt(e.target.value) } : x))}
                            onBlur={e => updateCell(m, { jersey_number: e.target.value === "" ? null : parseInt(e.target.value) })}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-8 font-medium"
                            value={m.full_name}
                            onChange={e => setMembers(prev => prev.map(x => x.id === m.id ? { ...x, full_name: e.target.value } : x))}
                            onBlur={e => updateCell(m, { full_name: e.target.value })}
                          />
                        </TableCell>
                        <TableCell>
                          <Select value={m.role} onValueChange={v => updateCell(m, { role: v })}>
                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Input
                            type="date" className="h-8"
                            value={m.birth_date || ""}
                            onChange={e => setMembers(prev => prev.map(x => x.id === m.id ? { ...x, birth_date: e.target.value } : x))}
                            onBlur={e => updateCell(m, { birth_date: e.target.value })}
                          />
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Input
                            className="h-8 tabular-nums"
                            value={m.figc_number || ""}
                            onChange={e => setMembers(prev => prev.map(x => x.id === m.id ? { ...x, figc_number: e.target.value } : x))}
                            onBlur={e => updateCell(m, { figc_number: e.target.value })}
                          />
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Input
                            className="h-8 font-mono uppercase" maxLength={16}
                            value={m.fiscal_code || ""}
                            onChange={e => setMembers(prev => prev.map(x => x.id === m.id ? { ...x, fiscal_code: e.target.value.toUpperCase() } : x))}
                            onBlur={e => updateCell(m, { fiscal_code: e.target.value })}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditMember(m)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon" variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteMember(m)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </>
        )}
      </main>
      <Footer />

      {/* Team dialog */}
      <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingTeam ? "Modifica Squadra" : "Nuova Squadra"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome identificativo *</Label>
              <Input value={teamForm.name} onChange={e => setTeamForm({ ...teamForm, name: e.target.value })} placeholder="Es. Athletic Club Albaro" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Leva</Label>
                <Input value={teamForm.leva} onChange={e => setTeamForm({ ...teamForm, leva: e.target.value })} placeholder="Es. 2012" />
              </div>
              <div>
                <Label>Categoria</Label>
                <Input value={teamForm.category} onChange={e => setTeamForm({ ...teamForm, category: e.target.value })} placeholder="Es. Pulcini" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTeamDialogOpen(false)}>Annulla</Button>
            <Button onClick={saveTeam}>Salva</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Member dialog */}
      <Dialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingMemberId ? "Modifica Membro" : "Nuovo Membro"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Cognome e Nome *</Label>
              <Input value={memberForm.full_name} onChange={e => setMemberForm({ ...memberForm, full_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Data di nascita</Label>
                <Input type="date" value={memberForm.birth_date || ""} onChange={e => setMemberForm({ ...memberForm, birth_date: e.target.value })} />
              </div>
              <div><Label>Qualifica</Label>
                <Select value={memberForm.role} onValueChange={v => setMemberForm({ ...memberForm, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>N. Matricola FIGC</Label>
                <Input value={memberForm.figc_number || ""} onChange={e => setMemberForm({ ...memberForm, figc_number: e.target.value })} />
              </div>
              <div><Label>N. Maglia</Label>
                <Input type="number" min={0} max={99}
                  value={memberForm.jersey_number ?? ""}
                  onChange={e => setMemberForm({ ...memberForm, jersey_number: e.target.value === "" ? null : parseInt(e.target.value) })} />
              </div>
            </div>
            <div><Label>Codice Fiscale</Label>
              <Input value={memberForm.fiscal_code || ""}
                onChange={e => setMemberForm({ ...memberForm, fiscal_code: e.target.value.toUpperCase() })}
                className="font-mono" maxLength={16} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMemberDialogOpen(false)}>Annulla</Button>
            <Button onClick={saveMember}>Salva</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTeam} onOpenChange={(o) => !o && setDeleteTeam(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Elimina squadra</AlertDialogTitle>
            <AlertDialogDescription>
              Verranno eliminati anche tutti i membri dell'anagrafica di "{deleteTeam?.name}". L'operazione è irreversibile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteTeam}>Elimina</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteMember} onOpenChange={(o) => !o && setDeleteMember(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Elimina membro</AlertDialogTitle>
            <AlertDialogDescription>Vuoi eliminare "{deleteMember?.full_name}" dall'anagrafica?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteMember}>Elimina</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
