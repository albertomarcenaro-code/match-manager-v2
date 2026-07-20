import React, { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { TeamMember } from "@/pages/TeamMembers";
import { useNavigate } from "react-router-dom";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  tournamentName?: string;
  homeTeamName?: string;
  awayTeamName?: string;
  matchDate?: string;
  // jersey numbers keyed by member name (lower/trim) OR figc_number
  rosterNumbers?: Map<string, number>;
}

type CaptainMark = "" | "C" | "VC";

export function GenerateLineupSheet({
  open, onOpenChange, tournamentName, homeTeamName, awayTeamName, matchDate, rosterNumbers,
}: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<TeamMember[]>([]);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [captains, setCaptains] = useState<Record<string, CaptainMark>>({});
  const [staffRoles, setStaffRoles] = useState<Record<string, string>>({}); // memberId -> role slot

  const [gara, setGara] = useState("");
  const [campionato, setCampionato] = useState("");
  const [dataGara, setDataGara] = useState("");
  const [localita, setLocalita] = useState("");

  useEffect(() => {
    if (!open) return;
    const home = homeTeamName || "";
    const away = awayTeamName || "";
    setGara(home && away ? `${home} - ${away}`.toUpperCase() : "");
    setCampionato((tournamentName || "").toUpperCase());
    if (matchDate) {
      const d = new Date(matchDate);
      if (!isNaN(d.getTime())) {
        setDataGara(d.toLocaleDateString("it-IT", { weekday: "long", day: "2-digit", month: "2-digit" }).toUpperCase());
      }
    }
  }, [open, homeTeamName, awayTeamName, tournamentName, matchDate]);

  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("team_members")
        .select("id, full_name, birth_date, figc_number, fiscal_code, role")
        .eq("user_id", user.id)
        .order("full_name");
      if (error) toast.error("Errore caricamento anagrafica");
      else setMembers((data || []) as TeamMember[]);
      setLoading(false);
    })();
  }, [open, user]);

  const players = useMemo(
    () => members.filter((m) => (m.role || "").toLowerCase() === "giocatore"),
    [members]
  );
  const staff = useMemo(
    () => members.filter((m) => (m.role || "").toLowerCase() !== "giocatore"),
    [members]
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) {
        n.delete(id);
        setCaptains((c) => { const { [id]: _, ...rest } = c; return rest; });
      } else {
        n.add(id);
      }
      return n;
    });
  };

  const setCaptain = (id: string, mark: CaptainMark) => {
    setCaptains((prev) => {
      const n = { ...prev };
      // Only one C and one VC
      if (mark === "C") for (const k of Object.keys(n)) if (n[k] === "C") delete n[k];
      if (mark === "VC") for (const k of Object.keys(n)) if (n[k] === "VC") delete n[k];
      if (mark === "") delete n[id]; else n[id] = mark;
      return n;
    });
  };

  const lookupJersey = (m: TeamMember): string => {
    if (!rosterNumbers) return "";
    const byName = rosterNumbers.get(m.full_name.trim().toLowerCase());
    if (byName != null) return String(byName);
    if (m.figc_number) {
      const byFigc = rosterNumbers.get(`figc:${m.figc_number}`);
      if (byFigc != null) return String(byFigc);
    }
    return "";
  };

  const generate = async () => {
    const selectedPlayers = players
      .filter((p) => selected.has(p.id))
      .sort((a, b) => a.full_name.localeCompare(b.full_name, "it"));

    if (selectedPlayers.length === 0) {
      toast.error("Seleziona almeno un giocatore");
      return;
    }

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 12;
    let y = margin;

    // Header societario
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("S.S.D A.R.L. ATHLETIC CLUB ALBARO", pageW / 2, y, { align: "center" });
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("P.I. 02201200991 - Cod. Fisc. 95166490102 - Cod SDI N924-LON", pageW / 2, y, { align: "center" });
    y += 3.5;
    doc.text("Sede Via dei Ciclamini 1w - 16147 Genova (GE) - Tel/Fax: 010 4040118", pageW / 2, y, { align: "center" });
    y += 3.5;
    doc.text("mail: albaroathleticclub@gmail.com", pageW / 2, y, { align: "center" });
    y += 6;

    doc.setDrawColor(0);
    doc.line(margin, y, pageW - margin, y);
    y += 5;

    // Titolo
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("DISTINTA DEI GIOCATORI PARTECIPANTI ALLA GARA", pageW / 2, y, { align: "center" });
    y += 7;

    // Dati gara — riquadri
    doc.setFontSize(9);
    const labelCol = 40;
    const drawField = (label: string, value: string) => {
      doc.setFont("helvetica", "bold");
      doc.text(label, margin, y);
      doc.setFont("helvetica", "normal");
      doc.rect(margin + labelCol, y - 4, pageW - margin * 2 - labelCol, 6);
      doc.text(value || "", margin + labelCol + 2, y);
      y += 8;
    };
    drawField("Gara:", gara);
    drawField("Campionato/Torneo:", campionato);
    drawField("Data:", dataGara);
    drawField("Località / Orario:", localita);

    y += 2;

    // Griglia giocatori
    autoTable(doc, {
      startY: y,
      head: [["N° Maglia", "Data di nascita", "Cognome e Nome", "C", "N. Matricola F.I.G.C."]],
      body: selectedPlayers.map((p) => [
        lookupJersey(p),
        p.birth_date ? new Date(p.birth_date).toLocaleDateString("it-IT") : "",
        p.full_name.toUpperCase(),
        captains[p.id] || "",
        p.figc_number || "",
      ]),
      styles: { fontSize: 9, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.1 },
      headStyles: { fillColor: [230, 230, 230], textColor: 0, fontStyle: "bold", halign: "center" },
      columnStyles: {
        0: { halign: "center", cellWidth: 20 },
        1: { halign: "center", cellWidth: 30 },
        2: { cellWidth: "auto" },
        3: { halign: "center", cellWidth: 12 },
        4: { halign: "center", cellWidth: 35 },
      },
      theme: "grid",
      margin: { left: margin, right: margin },
    });

    y = (doc as any).lastAutoTable.finalY + 6;

    // Sezione staff
    const staffSlots: Array<{ label: string; roles: string[] }> = [
      { label: "Dirigente accompagnatore ufficiale", roles: ["dirigente accompagnatore ufficiale", "dirigente"] },
      { label: "Allenatore", roles: ["allenatore"] },
      { label: "Allenatore in seconda", roles: ["allenatore in seconda"] },
      { label: "Massaggiatore", roles: ["massaggiatore"] },
    ];

    const assigned = new Map<string, TeamMember>();
    for (const [mid, slot] of Object.entries(staffRoles)) {
      const m = staff.find((s) => s.id === mid);
      if (m) assigned.set(slot, m);
    }

    const staffRows = staffSlots.map((slot) => {
      const member = assigned.get(slot.label);
      return [
        slot.label + ":",
        member ? member.full_name.toUpperCase() : "",
        "Tessera N°:",
        member?.figc_number || "",
      ];
    });

    autoTable(doc, {
      startY: y,
      body: staffRows,
      styles: { fontSize: 9, cellPadding: 1.8, lineColor: [0, 0, 0], lineWidth: 0.1 },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 65 },
        1: { cellWidth: "auto" },
        2: { fontStyle: "bold", cellWidth: 25 },
        3: { cellWidth: 30 },
      },
      theme: "grid",
      margin: { left: margin, right: margin },
    });

    y = (doc as any).lastAutoTable.finalY + 6;

    // Dichiarazione
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const dichiarazione =
      "Le persone qui sopra elencate possono essere ammesse in campo solo se munite della prescritta tessera F.I.G.C. valida per l'anno in corso. " +
      "Il sottoscritto dirigente accompagnatore ufficiale dichiara che i giocatori sopraindicati sono regolarmente tesserati e partecipano alla gara sotto la responsabilità della Società di appartenenza, giusto le norme vigenti.";
    const lines = doc.splitTextToSize(dichiarazione, pageW - margin * 2);
    doc.text(lines, margin, y);
    y += lines.length * 3.5 + 8;

    // Firme
    const boxW = (pageW - margin * 2 - 10) / 2;
    doc.rect(margin, y, boxW, 22);
    doc.rect(margin + boxW + 10, y, boxW, 22);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("L'ARBITRO", margin + boxW / 2, y + 20, { align: "center" });
    doc.text("Dirigente accompagnatore ufficiale", margin + boxW + 10 + boxW / 2, y + 20, { align: "center" });

    const filename = `distinta_${(gara || "gara").replace(/[^a-z0-9]+/gi, "_")}_${(dataGara || new Date().toISOString().slice(0, 10)).replace(/[^a-z0-9]+/gi, "_")}.pdf`.toLowerCase();
    doc.save(filename);
    toast.success("Distinta generata");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> Genera Distinta Gara
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-6 space-y-3">
            <p className="text-sm text-muted-foreground">
              Non hai ancora registrato membri in anagrafica.
            </p>
            <Button onClick={() => { onOpenChange(false); navigate("/team-members"); }}>
              Vai all'Anagrafica Squadra
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Dati gara */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>Gara</Label><Input value={gara} onChange={(e) => setGara(e.target.value)} /></div>
              <div><Label>Campionato / Torneo</Label><Input value={campionato} onChange={(e) => setCampionato(e.target.value)} /></div>
              <div><Label>Data</Label><Input value={dataGara} onChange={(e) => setDataGara(e.target.value)} placeholder="es. SABATO 07/02" /></div>
              <div><Label>Località / Orario</Label><Input value={localita} onChange={(e) => setLocalita(e.target.value)} placeholder="es. VIA PRASCA H.15.30" /></div>
            </div>

            {/* Giocatori */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm">Giocatori convocati ({selected.size})</h3>
              </div>
              <div className="border rounded-md divide-y max-h-72 overflow-y-auto">
                {players.length === 0 && (
                  <p className="p-3 text-xs text-muted-foreground">Nessun giocatore in anagrafica.</p>
                )}
                {players.map((p) => {
                  const isSel = selected.has(p.id);
                  return (
                    <div key={p.id} className="flex items-center gap-2 p-2 text-sm">
                      <Checkbox checked={isSel} onCheckedChange={() => toggle(p.id)} />
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium">{p.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.birth_date ? new Date(p.birth_date).toLocaleDateString("it-IT") : "—"} · Matr. {p.figc_number || "—"}
                        </p>
                      </div>
                      {isSel && (
                        <Select value={captains[p.id] || "_none"} onValueChange={(v) => setCaptain(p.id, v === "_none" ? "" : v as CaptainMark)}>
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
              <h3 className="font-semibold text-sm mb-2">Staff convocato</h3>
              <div className="border rounded-md divide-y max-h-60 overflow-y-auto">
                {staff.length === 0 && (
                  <p className="p-3 text-xs text-muted-foreground">Nessun membro staff in anagrafica.</p>
                )}
                {staff.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 p-2 text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">{s.full_name}</p>
                      <p className="text-xs text-muted-foreground">{s.role} · Tess. {s.figc_number || "—"}</p>
                    </div>
                    <Select
                      value={staffRoles[s.id] || "_none"}
                      onValueChange={(v) =>
                        setStaffRoles((prev) => {
                          const n = { ...prev };
                          if (v === "_none") delete n[s.id];
                          else {
                            // ensure single occupant per slot
                            for (const k of Object.keys(n)) if (n[k] === v) delete n[k];
                            n[s.id] = v;
                          }
                          return n;
                        })
                      }
                    >
                      <SelectTrigger className="w-56 h-8 text-xs"><SelectValue placeholder="Assegna ruolo distinta" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">— non convocato</SelectItem>
                        <SelectItem value="Dirigente accompagnatore ufficiale">Dirigente accompagnatore</SelectItem>
                        <SelectItem value="Allenatore">Allenatore</SelectItem>
                        <SelectItem value="Allenatore in seconda">Allenatore in seconda</SelectItem>
                        <SelectItem value="Massaggiatore">Massaggiatore</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button onClick={generate} disabled={loading || members.length === 0} className="gap-2">
            <FileText className="h-4 w-4" /> Genera PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
