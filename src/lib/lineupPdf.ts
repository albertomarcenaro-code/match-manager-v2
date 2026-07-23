import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { TeamMember } from "@/pages/TeamMembers";
import type { LineupSelection, MatchMetadata } from "@/types/match";

interface BuildOpts {
  members: TeamMember[];
  selection: LineupSelection;
  metadata: MatchMetadata;
  homeTeamName: string;
  awayTeamName: string;
  /** jersey numbers keyed by member name (lower/trim). */
  rosterNumbersByName?: Map<string, number>;
}

const staffSlots: Array<{ label: string }> = [
  { label: "Dirigente accompagnatore ufficiale" },
  { label: "Allenatore" },
  { label: "Allenatore in seconda" },
  { label: "Massaggiatore" },
];

const formatItDate = (iso: string) => {
  if (!iso) return "";
  const d = new Date(iso.length <= 10 ? iso + "T00:00:00" : iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("it-IT", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" }).toUpperCase();
};

export function buildLineupPdf(opts: BuildOpts): jsPDF {
  const { members, selection, metadata, homeTeamName, awayTeamName, rosterNumbersByName } = opts;

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

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("DISTINTA DEI GIOCATORI PARTECIPANTI ALLA GARA", pageW / 2, y, { align: "center" });
  y += 7;

  // Compose header fields from metadata; respect home/away order
  const home = metadata.isHomeTeam ? homeTeamName : awayTeamName;
  const away = metadata.isHomeTeam ? awayTeamName : homeTeamName;
  const gara = `${(home || "").toUpperCase()} - ${(away || "").toUpperCase()}`.replace(/^ - $/, "");
  const campionato = [metadata.tournamentLabel, metadata.groupName].filter(Boolean).join(" · ").toUpperCase();
  const dataGara = formatItDate(metadata.matchDate);
  const localita = [metadata.venue, metadata.matchTime ? `H.${metadata.matchTime}` : ""].filter(Boolean).join(" · ").toUpperCase();
  const categoria = [metadata.leva, metadata.category].filter(Boolean).join(" · ").toUpperCase();

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
  if (categoria) drawField("Leva / Categoria:", categoria);
  drawField("Data:", dataGara);
  drawField("Località / Orario:", localita);

  y += 2;

  const selectedIds = new Set(selection.playerIds);
  const players = members
    .filter(m => (m.role || "").toLowerCase() === "giocatore" && selectedIds.has(m.id))
    .sort((a, b) => a.full_name.localeCompare(b.full_name, "it"));

  const lookupJersey = (m: TeamMember): string => {
    if (m.jersey_number != null) return String(m.jersey_number);
    if (rosterNumbersByName) {
      const n = rosterNumbersByName.get(m.full_name.trim().toLowerCase());
      if (n != null) return String(n);
    }
    return "";
  };

  autoTable(doc, {
    startY: y,
    head: [["N° Maglia", "Data di nascita", "Cognome e Nome", "C", "N. Matricola F.I.G.C."]],
    body: players.map(p => [
      lookupJersey(p),
      p.birth_date ? new Date(p.birth_date).toLocaleDateString("it-IT") : "",
      p.full_name.toUpperCase(),
      selection.captains[p.id] || "",
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

  // Staff
  const staff = members.filter(m => (m.role || "").toLowerCase() !== "giocatore");
  const assigned = new Map<string, TeamMember>();
  for (const [mid, slot] of Object.entries(selection.staffRoles || {})) {
    const m = staff.find(s => s.id === mid);
    if (m) assigned.set(slot, m);
  }
  const staffRows = staffSlots.map(slot => {
    const m = assigned.get(slot.label);
    return [slot.label + ":", m ? m.full_name.toUpperCase() : "", "Tessera N°:", m?.figc_number || ""];
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

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const dichiarazione =
    "Le persone qui sopra elencate possono essere ammesse in campo solo se munite della prescritta tessera F.I.G.C. valida per l'anno in corso. " +
    "Il sottoscritto dirigente accompagnatore ufficiale dichiara che i giocatori sopraindicati sono regolarmente tesserati e partecipano alla gara sotto la responsabilità della Società di appartenenza, giusto le norme vigenti.";
  const lines = doc.splitTextToSize(dichiarazione, pageW - margin * 2);
  doc.text(lines, margin, y);
  y += lines.length * 3.5 + 8;

  const boxW = (pageW - margin * 2 - 10) / 2;
  doc.rect(margin, y, boxW, 22);
  doc.rect(margin + boxW + 10, y, boxW, 22);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("L'ARBITRO", margin + boxW / 2, y + 20, { align: "center" });
  doc.text("Dirigente accompagnatore ufficiale", margin + boxW + 10 + boxW / 2, y + 20, { align: "center" });

  return doc;
}

export function suggestedFilename(metadata: MatchMetadata, home: string, away: string): string {
  const base = `distinta_${home || "casa"}_${away || "ospiti"}_${metadata.matchDate || "gara"}`;
  return base.replace(/[^a-z0-9]+/gi, "_").toLowerCase() + ".pdf";
}
