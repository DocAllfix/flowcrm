import { AUTORI } from "@/contenuti/autori";
import { articoli } from "@/lib/blog";
import { URL_CANONICO } from "@/lib/sito";

export const dynamic = "force-static";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Il feed RSS 2.0 del blog: gli ultimi 30 articoli, con il riassunto (non il testo intero). */
export function GET() {
  const voci = articoli()
    .slice(0, 30)
    .map((a) => {
      const i = a.intestazione;
      const url = `${URL_CANONICO}/blog/${a.slug}`;
      return [
        "    <item>",
        `      <title>${esc(i.titolo)}</title>`,
        `      <link>${url}</link>`,
        `      <guid isPermaLink="true">${url}</guid>`,
        `      <description>${esc(i.descrizione)}</description>`,
        `      <pubDate>${new Date(`${i.data}T07:00:00Z`).toUTCString()}</pubDate>`,
        `      <dc:creator>${esc(AUTORI[i.autore]?.nome ?? "")}</dc:creator>`,
        "    </item>",
      ].join("\n");
    });
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">',
    "  <channel>",
    "    <title>Blog di PMIFlow</title>",
    `    <link>${URL_CANONICO}/blog</link>`,
    `    <atom:link href="${URL_CANONICO}/blog/feed.xml" rel="self" type="application/rss+xml" />`,
    "    <description>Metodi e strumenti per chi manda avanti una piccola impresa.</description>",
    "    <language>it-IT</language>",
    ...voci,
    "  </channel>",
    "</rss>",
  ].join("\n");
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
