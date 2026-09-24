import type { MetadataRoute } from "next";
import { URL_CANONICO, LEGALI_AGGIORNATI_AL } from "@/lib/sito";

/**
 * `lastModified` solo dove la data è VERA: le pagine legali hanno la loro. La home no,
 * e l'istante di compilazione la dichiarerebbe modificata a ogni rilascio; Google
 * impara a ignorare un campo che cambia sempre (lezione di evalisdeck, `sitemap.ts`).
 * `/grazie` non c'è: è `noindex`, e un noindex in sitemap è una contraddizione.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const legali = new Date(LEGALI_AGGIORNATI_AL);
  return [
    { url: `${URL_CANONICO}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${URL_CANONICO}/sicurezza`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${URL_CANONICO}/privacy`, lastModified: legali, changeFrequency: "yearly", priority: 0.2 },
    { url: `${URL_CANONICO}/cookie`, lastModified: legali, changeFrequency: "yearly", priority: 0.2 },
    { url: `${URL_CANONICO}/termini`, lastModified: legali, changeFrequency: "yearly", priority: 0.2 },
  ];
}
