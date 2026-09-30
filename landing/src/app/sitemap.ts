import type { MetadataRoute } from "next";
import { AUTORI } from "@/contenuti/autori";
import { MODULI } from "@/contenuti/moduli";
import { articoli } from "@/lib/blog";
import { URL_CANONICO, LEGALI_AGGIORNATI_AL } from "@/lib/sito";

/**
 * `lastModified` solo dove la data è VERA: le pagine legali hanno la loro. La home no,
 * e l'istante di compilazione la dichiarerebbe modificata a ogni rilascio; Google
 * impara a ignorare un campo che cambia sempre (lezione di evalisdeck, `sitemap.ts`).
 * `/grazie` non c'è: è `noindex`, e un noindex in sitemap è una contraddizione.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const legali = new Date(LEGALI_AGGIORNATI_AL);
  // Il blog entra solo con articoli pubblicati; ogni articolo con la sua data vera.
  const blog = articoli();
  const settori = [...new Set(blog.map((a) => a.intestazione.settore))];
  const autori = Object.keys(AUTORI).filter((id) => blog.some((a) => a.intestazione.autore === id));
  const voceBlog: MetadataRoute.Sitemap = blog.length
    ? [
        { url: `${URL_CANONICO}/blog`, lastModified: new Date(blog[0]!.intestazione.data), changeFrequency: "weekly", priority: 0.7 },
        ...settori.map((s) => ({ url: `${URL_CANONICO}/blog/settore/${s}`, changeFrequency: "weekly" as const, priority: 0.5 })),
        ...autori.map((id) => ({ url: `${URL_CANONICO}/blog/autori/${id}`, changeFrequency: "monthly" as const, priority: 0.4 })),
        ...blog.map((a) => ({
          url: `${URL_CANONICO}/blog/${a.slug}`,
          lastModified: new Date(a.intestazione.aggiornato ?? a.intestazione.data),
          changeFrequency: "monthly" as const,
          priority: 0.6,
        })),
      ]
    : [];
  return [
    { url: `${URL_CANONICO}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${URL_CANONICO}/moduli`, changeFrequency: "monthly", priority: 0.9 },
    ...MODULI.map((m) => ({ url: `${URL_CANONICO}/moduli/${m.id}`, changeFrequency: "monthly" as const, priority: 0.9 })),
    { url: `${URL_CANONICO}/sicurezza`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${URL_CANONICO}/privacy`, lastModified: legali, changeFrequency: "yearly", priority: 0.2 },
    { url: `${URL_CANONICO}/cookie`, lastModified: legali, changeFrequency: "yearly", priority: 0.2 },
    { url: `${URL_CANONICO}/termini`, lastModified: legali, changeFrequency: "yearly", priority: 0.2 },
    ...voceBlog,
  ];
}
