/**
 * Slot staff della distinta ufficiale.
 *
 * Una gara può elencare fino a 3 allenatori e fino a 3 dirigenti: ogni posto è
 * uno slot numerato, così UI e PDF concordano su "al massimo una persona per
 * slot" senza impedire 3 allenatori o 3 dirigenti nella stessa partita.
 */
export const STAFF_SLOT_LABELS = [
  "Allenatore 1",
  "Allenatore 2",
  "Allenatore 3",
  "Dirigente 1",
  "Dirigente 2",
  "Dirigente 3",
  "Massaggiatore",
] as const;

export type StaffSlot = (typeof STAFF_SLOT_LABELS)[number];

/** Etichette salvate dalle distinte create prima degli slot numerati. */
const LEGACY_SLOTS: Record<string, StaffSlot> = {
  "Allenatore": "Allenatore 1",
  "Allenatore in seconda": "Allenatore 2",
  "Dirigente accompagnatore ufficiale": "Dirigente 1",
  "Massaggiatore": "Massaggiatore",
};

/**
 * Riconduce un'etichetta salvata (anche di una vecchia distinta) a uno slot
 * valido, oppure null se sconosciuta.
 */
export function normalizeStaffSlot(label: string | null | undefined): StaffSlot | null {
  if (!label) return null;
  const trimmed = label.trim();
  if ((STAFF_SLOT_LABELS as readonly string[]).includes(trimmed)) return trimmed as StaffSlot;
  return LEGACY_SLOTS[trimmed] ?? null;
}
