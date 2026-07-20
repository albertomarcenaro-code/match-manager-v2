import React, { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet";
import { useNavigate } from "react-router-dom";
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
import { ChevronLeft, Upload, Plus, Trash2, Loader2, Pencil, IdCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const ROLES = ["Giocatore", "Allenatore", "Dirigente", "Massaggiatore"];

export interface TeamMember {
  id: string;
  full_name: string;
  birth_date: string | null;
  figc_number: string | null;
  fiscal_code: string | null;
  role: string;
}

const emptyForm: Omit<TeamMember, "id"> = {
  full_name: "",
  birth_date: "",
  figc_number: "",
  fiscal_code: "",
  role: "Giocatore",
};

export default function TeamMembers() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<TeamMember, "id">>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  useEffect(() => {
    if (user) load();
  }, [user]);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("team_members")
      .select("id, full_name, birth_date, figc_number, fiscal_code, role")
      .eq("user_id", user.id)
      .order("full_name", { ascending: true });
    if (error) toast.error("Errore nel caricamento");
    else setMembers((data || []) as TeamMember[]);
    setLoading(false);
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setEditOpen(true);
  };
  const openEdit = (m: TeamMember) => {
    setEditingId(m.id);
    setForm({
      full_name: m.full_name,
      birth_date: m.birth_date || "",
      figc_number: m.figc_number || "",
      fiscal_code: m.fiscal_code || "",
      role: m.role,
    });
    setEditOpen(true);
  };

  const saveMember = async () => {
    if (!user) return;
    const full_name = form.full_name.trim();
    if (!full_name) return toast.error("Nome obbligatorio");
    const payload = {
      user_id: user.id,
      full_name,
      birth_date: form.birth_date || null,
      figc_number: form.figc_number?.trim() || null,
      fiscal_code: form.fiscal_code?.trim().toUpperCase() || null,
      role: form.role || "Giocatore",
    };
    const { error } = editingId
      ? await supabase.from("team_members").update(payload).eq("id", editingId).eq("user_id", user.id)
      : await supabase.from("team_members").insert(payload);
    if (error) return toast.error("Errore nel salvataggio");
    toast.success("Membro salvato");
    setEditOpen(false);
    load();
  };

  const confirmDelete = async () => {
    if (!user || !deleteTarget) return;
    const { error } = await supabase.from("team_members").delete().eq("id", deleteTarget).eq("user_id", user.id);
    if (error) toast.error("Errore");
    else {
      setMembers((prev) => prev.filter((m) => m.id !== deleteTarget));
      toast.success("Membro eliminato");
    }
    setDeleteTarget(null);
  };

  // Excel import — matches Elenco_Distinta.xlsx layout
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) return;
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { cellDates: true });
      const rows: any[] = [];
      for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        const json: any[] = XLSX.utils.sheet_to_json(ws, { defval: null, raw: false });
        rows.push(...json);
      }

      const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "").replace(/[.]/g, "");
      const pick = (r: any, keys: string[]) => {
        for (const k of Object.keys(r)) {
          if (keys.includes(norm(k))) return r[k];
        }
        return null;
      };

      const parseDate = (v: any): string | null => {
        if (!v) return null;
        if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString().slice(0, 10);
        const s = String(v).trim();
        if (!s || s === ".") return null;
        // dd/mm/yyyy
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

      const payload = rows
        .map((r) => {
          const name = pick(r, ["cognomenome", "cognomeenome", "nome", "nominativo"]);
          if (!name) return null;
          const role = String(pick(r, ["qualifica", "ruolo"]) || "Giocatore").trim();
          return {
            user_id: user.id,
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
          };
        })
        .filter(Boolean) as any[];

      if (payload.length === 0) {
        toast.error("Nessun record valido trovato nel file");
        return;
      }

      // Split by conflict target because we have two partial unique indexes
      const withFiscal = payload.filter((p) => p.fiscal_code);
      const withoutFiscal = payload.filter((p) => !p.fiscal_code);

      let ok = 0;
      if (withFiscal.length) {
        const { error, count } = await supabase
          .from("team_members")
          .upsert(withFiscal, { onConflict: "user_id,fiscal_code", ignoreDuplicates: false, count: "exact" as any });
        if (error) throw error;
        ok += count ?? withFiscal.length;
      }
      if (withoutFiscal.length) {
        // Fallback: fetch existing names then update or insert
        const names = withoutFiscal.map((p) => p.full_name.toLowerCase().trim());
        const { data: existing } = await supabase
          .from("team_members")
          .select("id, full_name")
          .eq("user_id", user.id)
          .in("full_name", withoutFiscal.map((p) => p.full_name));
        const existingMap = new Map<string, string>(
          (existing || []).map((e: any) => [e.full_name.toLowerCase().trim(), e.id])
        );
        for (const p of withoutFiscal) {
          const key = p.full_name.toLowerCase().trim();
          if (existingMap.has(key)) {
            await supabase.from("team_members").update(p).eq("id", existingMap.get(key)!).eq("user_id", user.id);
          } else {
            await supabase.from("team_members").insert(p);
          }
          ok += 1;
        }
      }

      toast.success(`Importati/aggiornati ${ok} membri`);
      load();
    } catch (err: any) {
      console.error("Import error:", err);
      toast.error("Errore durante l'importazione del file");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const byRole: Record<string, TeamMember[]> = {};
  for (const m of members) {
    (byRole[m.role] ||= []).push(m);
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Anagrafica Squadra | Match Manager Live</title>
        <meta name="description" content="Gestisci l'anagrafica ufficiale della squadra: giocatori, allenatori e staff dirigenziale con matricola F.I.G.C." />
      </Helmet>
      <Header />
      <main className="flex-1 p-4 max-w-4xl mx-auto w-full pt-6">
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
              Registro ufficiale per la generazione delle distinte gara F.I.G.C.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mb-6">
          <Button onClick={openAdd} className="gap-2 flex-1">
            <Plus className="h-4 w-4" /> Aggiungi Membro
          </Button>
          <Button
            variant="outline"
            className="gap-2 flex-1"
            onClick={() => fileRef.current?.click()}
            disabled={importing}
          >
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Importa Excel
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFile}
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : members.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground text-sm">
              Nessun membro registrato. Aggiungi manualmente o importa il file Excel della società.
            </p>
          </Card>
        ) : (
          <div className="space-y-6">
            {ROLES.filter((r) => byRole[r]?.length).concat(
              Object.keys(byRole).filter((r) => !ROLES.includes(r))
            ).map((role) => (
              <Card key={role} className="p-4">
                <h2 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">
                  {role} ({byRole[role].length})
                </h2>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cognome Nome</TableHead>
                        <TableHead className="hidden sm:table-cell">Nascita</TableHead>
                        <TableHead>Matricola</TableHead>
                        <TableHead className="hidden md:table-cell">Cod. Fiscale</TableHead>
                        <TableHead className="w-20 text-right">Azioni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {byRole[role].map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="font-medium">{m.full_name}</TableCell>
                          <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                            {m.birth_date ? new Date(m.birth_date).toLocaleDateString("it-IT") : "—"}
                          </TableCell>
                          <TableCell className="text-xs tabular-nums">{m.figc_number || "—"}</TableCell>
                          <TableCell className="hidden md:table-cell text-xs font-mono">{m.fiscal_code || "—"}</TableCell>
                          <TableCell className="text-right">
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(m)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => setDeleteTarget(m.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
      <Footer />

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Modifica Membro" : "Nuovo Membro"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Cognome e Nome *</Label>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data di nascita</Label>
                <Input type="date" value={form.birth_date || ""} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} />
              </div>
              <div>
                <Label>Qualifica</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>N. Matricola F.I.G.C.</Label>
              <Input value={form.figc_number || ""} onChange={(e) => setForm({ ...form, figc_number: e.target.value })} />
            </div>
            <div>
              <Label>Codice Fiscale</Label>
              <Input
                value={form.fiscal_code || ""}
                onChange={(e) => setForm({ ...form, fiscal_code: e.target.value.toUpperCase() })}
                className="font-mono"
                maxLength={16}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Annulla</Button>
            <Button onClick={saveMember}>Salva</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Elimina membro</AlertDialogTitle>
            <AlertDialogDescription>Vuoi eliminare questo membro dall'anagrafica?</AlertDialogDescription>
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
