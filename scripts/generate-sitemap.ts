import { writeFileSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://matchmanager-live.lovable.app";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://rhqaflmzqgtvinaeveuo.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJocWFmbG16cWd0dmluYWV2ZXVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNDUwODgsImV4cCI6MjA4MjkyMTA4OH0.8LmHdTP2vjfgVRyqprgCpuRfDBiE25r6J9dsHojFJ1Q";

async function fetchPublicRows(table: string, timestampCol: string): Promise<{ id: string; ts: string | null }[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn(`Skipping ${table}: Supabase env vars not available at build time.`);
    return [];
  }
  try {
    const url = `${SUPABASE_URL}/rest/v1/${table}?select=id,${timestampCol}&is_public=eq.true`;
    const res = await fetch(url, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (!res.ok) {
      console.warn(`Failed to fetch ${table}: ${res.status} ${res.statusText}`);
      return [];
    }
    const data = await res.json();
    return data.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      ts: row[timestampCol] as string | null,
    }));
  } catch (err) {
    console.warn(`Error fetching ${table}:`, err);
    return [];
  }
}

function generateSitemap(entries: SitemapEntry[]): string {
  const urls = entries.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ]
      .filter(Boolean)
      .join("\n"),
  );

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n");
}

async function main() {
  const staticEntries: SitemapEntry[] = [
    { path: "/", changefreq: "weekly", priority: "1.0" },
    { path: "/auth", changefreq: "monthly", priority: "0.3" },
    { path: "/terms", changefreq: "monthly", priority: "0.3" },
    { path: "/privacy", changefreq: "monthly", priority: "0.3" },
    { path: "/about", changefreq: "monthly", priority: "0.5" },
    { path: "/overview", changefreq: "weekly", priority: "0.8" },
  ];

  const publicMatches = await fetchPublicRows("matches", "created_at");
  const publicTournaments = await fetchPublicRows("tournaments", "updated_at");

  const dynamicEntries: SitemapEntry[] = [
    ...publicMatches.map((m) => ({
      path: `/live/match/${m.id}`,
      lastmod: m.ts ? m.ts.split("T")[0] : undefined,
      changefreq: "hourly" as const,
      priority: "0.7",
    })),
    ...publicTournaments.map((t) => ({
      path: `/live/tournament/${t.id}`,
      lastmod: t.ts ? t.ts.split("T")[0] : undefined,
      changefreq: "hourly" as const,
      priority: "0.7",
    })),
  ];

  const allEntries = [...staticEntries, ...dynamicEntries];
  const sitemap = generateSitemap(allEntries);
  writeFileSync(resolve("public/sitemap.xml"), sitemap);
  console.log(`sitemap.xml written (${allEntries.length} entries)`);
}

main().catch((err) => {
  console.error("Failed to generate sitemap:", err);
  process.exit(1);
});
