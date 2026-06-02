import { writeFileSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://matchmanager-live.lovable.app";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

async function fetchPublicRows(table: string): Promise<{ id: string; updated_at: string | null }[]> {
  const url = `${process.env.VITE_SUPABASE_URL}/rest/v1/${table}?select=id,updated_at&is_public=eq.true`;
  const res = await fetch(url, {
    headers: {
      apikey: process.env.VITE_SUPABASE_PUBLISHABLE_KEY!,
      Authorization: `Bearer ${process.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
  });
  if (!res.ok) {
    console.warn(`Failed to fetch ${table}: ${res.status} ${res.statusText}`);
    return [];
  }
  return res.json();
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

  const publicMatches = await fetchPublicRows("matches");
  const publicTournaments = await fetchPublicRows("tournaments");

  const dynamicEntries: SitemapEntry[] = [
    ...publicMatches.map((m) => ({
      path: `/live/match/${m.id}`,
      lastmod: m.updated_at ? m.updated_at.split("T")[0] : undefined,
      changefreq: "hourly" as const,
      priority: "0.7",
    })),
    ...publicTournaments.map((t) => ({
      path: `/live/tournament/${t.id}`,
      lastmod: t.updated_at ? t.updated_at.split("T")[0] : undefined,
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
