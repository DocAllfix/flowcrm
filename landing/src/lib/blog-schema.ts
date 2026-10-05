/**
 * Il formato degli articoli del blog: intestazione, lettura del file, date.
 *
 * ⚠️ Questo file NON importa niente del progetto (niente alias `@/`, niente React):
 * lo usa anche `scripts/verifica-articoli.mjs`, che gira con Node puro
 * (`node scripts/verifica-articoli.mjs`, tipi rimossi al volo da Node 24). Tenerlo
 * indipendente è ciò che rende il controllo identico alla pagina: stesso schema, stesse
 * regole, un solo posto dove cambiarle.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse as leggiYaml } from "yaml";
import { z } from "zod";

export const SETTORI_BLOG = [
  "cantiere",
  "gare",
  "automezzi",
  "agenti",
  "poliambulatori",
  "ristorante",
  "bar",
  "hotel",
  "palestra",
  "fioraio",
  "garage",
  "immobiliare",
  "nucleo",
] as const;
export type SettoreBlog = (typeof SETTORI_BLOG)[number];

/** I nomi da mostrare: gli stessi di `contenuti/moduli.ts`, più il nucleo. */
export const NOMI_SETTORI: Record<SettoreBlog, string> = {
  cantiere: "Cantiere",
  gare: "Gare d'appalto",
  automezzi: "Automezzi",
  agenti: "Agenti",
  poliambulatori: "Poliambulatori",
  ristorante: "Ristorante",
  bar: "Bar",
  hotel: "Hotel",
  palestra: "Palestra",
  fioraio: "Fioraio",
  garage: "Garage e autorimesse",
  immobiliare: "Agenzia immobiliare",
  nucleo: "Gestione d'impresa",
};

export const AUTORI_BLOG = ["alessandro"] as const;

const DATA = /^\d{4}-\d{2}-\d{2}$/;

export const IntestazioneArticolo = z.object({
  titolo: z.string().min(30, "titolo sotto i 30 caratteri").max(65, "titolo oltre i 65 caratteri"),
  descrizione: z.string().min(120, "descrizione sotto i 120 caratteri").max(160, "descrizione oltre i 160 caratteri"),
  data: z.string().regex(DATA, "data nel formato AAAA-MM-GG"),
  aggiornato: z.string().regex(DATA, "aggiornato nel formato AAAA-MM-GG").optional(),
  autore: z.enum(AUTORI_BLOG),
  settore: z.enum(SETTORI_BLOG),
  parolaChiave: z.string().min(3),
  immagine: z.string().startsWith("/blog/").optional(),
  bozza: z.boolean().default(false),
  origine: z.enum(["umano", "agente"]).default("umano"),
});
export type Intestazione = z.infer<typeof IntestazioneArticolo>;

export type FileArticolo = { slug: string; file: string; intestazione: Intestazione; corpo: string };

export const CARTELLA_BLOG = path.join(process.cwd(), "src/contenuti/blog");

/** Separa intestazione YAML e corpo. Lancia con un messaggio che nomina il file. */
export function leggiArticolo(file: string, testo: string): FileArticolo {
  const slug = path.basename(file, ".md");
  const m = testo.replace(/\r\n/g, "\n").match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error(`${file}: manca l'intestazione tra due righe «---»`);
  const esito = IntestazioneArticolo.safeParse(leggiYaml(m[1]!));
  if (!esito.success) {
    const motivi = esito.error.issues.map((i) => `${i.path.join(".") || "intestazione"}: ${i.message}`).join("; ");
    throw new Error(`${file}: ${motivi}`);
  }
  return { slug, file, intestazione: esito.data, corpo: m[2]! };
}

/** Tutti i file `.md` della cartella, bozze e date future comprese. */
export function tuttiIFile(cartella = CARTELLA_BLOG): FileArticolo[] {
  let nomi: string[] = [];
  try {
    nomi = readdirSync(cartella).filter((n) => n.endsWith(".md") && !n.startsWith("_"));
  } catch {
    return [];
  }
  return nomi.map((n) => leggiArticolo(n, readFileSync(path.join(cartella, n), "utf8")));
}

/** La data di oggi a Roma, AAAA-MM-GG: è lì che si decide se un articolo è uscito. */
export function oggiARoma(adesso = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(adesso);
}

/**
 * Pubblicato = non bozza e data non futura. `anteprima` (variabile `BLOG_ANTEPRIMA=1`,
 * solo sulle anteprime di Vercel) mostra anche bozze e date future: è così che si legge
 * un articolo programmato prima che esca.
 */
export function eVisibile(i: Intestazione, oggi: string, anteprima: boolean): boolean {
  if (anteprima) return true;
  return !i.bozza && i.data <= oggi;
}

/** Testo leggibile del Markdown, per contare le parole. */
export function testoSemplice(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`|[\]-]/g, " ");
}

export function contaParole(md: string): number {
  return testoSemplice(md).split(/\s+/).filter((p) => /[\p{L}\d]/u.test(p)).length;
}
