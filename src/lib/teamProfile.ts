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
  "id, name, category, season, vat_number, fiscal_code, sdi_code, address, phone, email, logo_url";

export async function fetchTeamProfile(teamId: string): Promise<TeamProfile | null> {
  const { data, error } = await supabase
    .from("saved_teams")
    .select(TEAM_PROFILE_COLUMNS)
    .eq("id", teamId)
    .maybeSingle();
  if (error || !data) return null;
  return mapTeamProfile(data);
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
