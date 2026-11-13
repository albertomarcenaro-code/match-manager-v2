import { supabase } from "@/integrations/supabase/client";

export interface TeamProfile {
  id: string;
  name: string;
  leva: string;
  category: string;
  season: string;
  vat_number: string;
  fiscal_code: string;
  sdi_code: string;
  address: string;
  phone: string;
  email: string;
  logo_url: string; // storage path inside the "team-logos" bucket
}

export const LOGO_BUCKET = "team-logos";

const decodeCategory = (raw: string | null | undefined) => {
  const s = (raw || "").trim();
  if (!s) return { leva: "", category: "" };
  const parts = s.split("|").map((p) => p.trim());
  if (parts.length >= 2) return { leva: parts[0], category: parts.slice(1).join(" | ") };
  return { leva: "", category: s };
};

export const mapTeamProfile = (t: any): TeamProfile => {
  const { leva, category } = decodeCategory(t.category);
  return {
    id: t.id,
    name: t.name || "",
    leva,
    category,
    season: t.season || "",
    vat_number: t.vat_number || "",
    fiscal_code: t.fiscal_code || "",
    sdi_code: t.sdi_code || "",
    address: t.address || "",
    phone: t.phone || "",
    email: t.email || "",
    logo_url: t.logo_url || "",
  };
};

export const TEAM_PROFILE_COLUMNS =
  "id, user_id, name, category, season, vat_number, fiscal_code, sdi_code, address, phone, email, logo_url, team_code";

/**
 * Set di colonne in ordine di dettaglio decrescente.
 *
 * Il DB di produzione può non avere ancora `team_code` (migrazione non
 * applicata) oppure esporre solo alcune colonne via GRANT per colonna: in quel
 * caso una select "completa" fallisce con 42703/42501 e la pagina resterebbe
 * vuota. Provando insiemi via via più piccoli la lettura riesce comunque.
 */
const TEAM_COLUMN_SETS: Array<{ columns: string; order: boolean }> = [
  { columns: TEAM_PROFILE_COLUMNS, order: true },
  { columns: "id, user_id, name, category, season, vat_number, fiscal_code, sdi_code, address, phone, email, logo_url", order: true },
  { columns: "id, name, category, season, logo_url", order: true },
  // `updated_at` può non essere leggibile con le grant per colonna: ordine ommesso.
  { columns: "id, name, category, season, logo_url", order: false },
  { columns: "id, name, category", order: false },
];

export interface SavedTeamsResult {
  rows: any[];
  /** false se `team_code` non è leggibile: la condivisione va mostrata come non attiva. */
  teamCodeAvailable: boolean;
  error: { message: string } | null;
}

/** Squadre visibili all'utente: le proprie più quelle condivise che ha joinato. */
export async function fetchSavedTeams(userId: string): Promise<SavedTeamsResult> {
  // Id delle squadre joinate (la tabella può non esistere su DB vecchi).
  let joinedIds: string[] = [];
  try {
    const { data } = await supabase.from("user_team_joins" as any).select("team_id").eq("user_id", userId);
    joinedIds = ((data || []) as any[]).map(r => r.team_id).filter(Boolean);
  } catch {
    joinedIds = [];
  }

  let lastError: { message: string } | null = null;
  for (const attempt of TEAM_COLUMN_SETS) {
    let query = supabase.from("saved_teams").select(attempt.columns);
    if (attempt.order) query = query.order("updated_at", { ascending: false });
    const { data, error } = await query;
    if (error) {
      lastError = { message: error.message };
      console.warn("[teams] select saved_teams fallita, riprovo con meno colonne:", attempt.columns, error.message);
      continue;
    }
    const rows = (data || []) as any[];
    // Le policy possono rendere visibili squadre di altri (lookup per codice):
    // mostriamo solo le proprie e quelle che l'utente ha joinato.
    const scoped = rows.some(r => "user_id" in r)
      ? rows.filter(r => r.user_id === userId || joinedIds.includes(r.id))
      : rows;
    return { rows: scoped, teamCodeAvailable: attempt.columns.includes("team_code"), error: null };
  }
  return { rows: [], teamCodeAvailable: false, error: lastError };
}

export async function fetchTeamProfile(teamId: string): Promise<TeamProfile | null> {
  for (const attempt of TEAM_COLUMN_SETS) {
    const { data, error } = await supabase
      .from("saved_teams")
      .select(attempt.columns)
      .eq("id", teamId)
      .maybeSingle();
    if (!error) return data ? mapTeamProfile(data) : null;
    console.warn("[teams] profilo squadra non leggibile con queste colonne:", attempt.columns, error.message);
  }
  return null;
}

/** Signed URL for a logo stored in the private bucket. */
export async function getLogoSignedUrl(path: string, expiresIn = 3600): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(LOGO_BUCKET).createSignedUrl(path, expiresIn);
  if (error || !data) return null;
  return data.signedUrl;
}

/** Base64 data URL of the logo, usable by jsPDF addImage. */
export async function getLogoDataUrl(path: string): Promise<string | null> {
  try {
    const signed = await getLogoSignedUrl(path);
    if (!signed) return null;
    const res = await fetch(signed);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}
