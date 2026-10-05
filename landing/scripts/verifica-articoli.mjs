/**
 * Controllo editoriale degli articoli del blog, PRIMA che escano.
 *
 *   npm run verifica-articoli            # tutti i file, bozze e date future comprese
 *   npm run verifica-articoli -- <slug>  # uno solo
 *
 * Lo lanciano la CI (job `landing`), l'agente di redazione dopo ogni stesura e chiunque
 * scriva a mano. Esce con 1 se anche un solo articolo ha un errore: la PR resta rossa e
 * l'unione automatica non parte.
 *
 * Lo schema dell'intestazione è quello di `src/lib/blog-schema.ts`, importato così
 * com'è (Node 24 toglie i tipi al volo): pagina e controllo non possono divergere.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { contaParole, leggiArticolo, SETTORI_BLOG } from "../src/lib/blog-schema.ts";

const qui = path.dirname(fileURLToPath(import.meta.url));
const RADICE = path.join(qui, "..");
const CARTELLA = path.join(RADICE, "src/contenuti/blog");
const PUBBLICA = path.join(RADICE, "public");
const MINIMO_PAROLE = 900;

// Le pagine /moduli/<id> sono quelle dei settori del blog (tranne il nucleo): un elenco solo.
const ID_MODULI = SETTORI_BLOG.filter((s) => s !== "nucleo");
const PAGINE_FISSE = ["/", "/moduli", "/blog", "/sicurezza", "/privacy", "/cookie", "/termini", "/blog/feed.xml"];
const ANCORE_HOME = ["funzioni", "moduli", "anteprima", "come-si-parte", "domande", "contatti"];

/**
 * Termini vietati: ciò che il prodotto NON fa, dalla sezione «Da non scrivere» di
 * `redazione/FATTI.md` (una voce per riga, tra apici inversi). Se il file non c'è
 * ancora, il controllo si limita alle altre regole.
 */
function terminiVietati() {
  const f = path.join(RADICE, "redazione/FATTI.md");
  if (!existsSync(f)) return [];
  const testo = readFileSync(f, "utf8").replace(/\r\n/g, "\n");
  const sezione = testo.split(/^## /m).find((s) => s.startsWith("Da non scrivere"));
  if (!sezione) return [];
  return [...sezione.matchAll(/^- `([^`]+)`/gm)].map((m) => m[1]);
}

const soloSlug = process.argv[2];
const { readdirSync } = await import("node:fs");
const nomi = readdirSync(CARTELLA).filter((n) => n.endsWith(".md") && !n.startsWith("_"));
const vietati = terminiVietati();

let errori = 0;
const letti = [];
for (const nome of nomi) {
  try {
    letti.push(leggiArticolo(nome, readFileSync(path.join(CARTELLA, nome), "utf8")));
  } catch (e) {
    errori++;
    console.error(`✗ ${e.message}`);
  }
}

const slugs = new Map(letti.map((a) => [a.slug, a]));

for (const a of letti) {
  if (soloSlug && a.slug !== soloSlug) continue;
  const i = a.intestazione;
  const problemi = [];
  const avvisi = [];
  // Il corpo senza blocchi di codice: lì dentro un «#» o un «€» non contano.
  const corpo = a.corpo.replace(/```[\s\S]*?```/g, "");

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.slug)) problemi.push("nome del file non in minuscolo-con-trattini");
  if (/^# /m.test(corpo)) problemi.push("c'è un titolo «# …» nel testo: l'h1 è solo il titolo dell'articolo, nel testo si parte da «## …»");
  if (!/^## /m.test(corpo)) problemi.push("nessun sottotitolo «## …»: l'articolo deve essere diviso in sezioni");

  // Niente prezzi, con la stessa regola di verifica-seo.mjs sulla pagina servita.
  const prezzo = corpo.match(/€|&euro;|\bEUR\b|\beuro\b|\d\s*\/\s*(mese|anno|utente)\b|listino/i) || `${i.titolo} ${i.descrizione}`.match(/€|\beuro\b|listino/i);
  if (prezzo) problemi.push(`riferimento di prezzo («${prezzo[0]}»): mai prezzi sul sito, neanche nel blog`);
  if (/—/.test(corpo + i.titolo + i.descrizione)) problemi.push("lineetta lunga «—»: usare due punti, virgola o punto");

  for (const t of vietati) {
    if (new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(corpo)) problemi.push(`cita «${t}», che PMIFlow non fa (redazione/FATTI.md)`);
  }

  // Collegamenti
  for (const [, testo, href] of corpo.matchAll(/(?<!!)\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    if (!testo.trim()) problemi.push(`collegamento senza testo verso ${href}`);
    if (/^http:\/\//.test(href)) problemi.push(`collegamento non sicuro (http): ${href}`);
    if (!href.startsWith("/")) continue;
    const [percorso, ancora] = href.split("#");
    if (percorso === "/" && ancora && !ANCORE_HOME.includes(ancora)) problemi.push(`àncora inesistente in home: ${href}`);
    else if (PAGINE_FISSE.includes(percorso || "/")) continue;
    else if (/^\/moduli\/[a-z-]+$/.test(percorso) && ID_MODULI.includes(percorso.split("/")[2])) continue;
    else if (/^\/blog\/settore\/[a-z-]+$/.test(percorso) && SETTORI_BLOG.includes(percorso.split("/")[3])) continue;
    else if (/^\/blog\/[a-z0-9-]+$/.test(percorso)) {
      const altro = slugs.get(percorso.split("/")[2]);
      if (!altro) problemi.push(`collegamento a un articolo inesistente: ${href}`);
      else if (altro.intestazione.bozza || altro.intestazione.data > i.data) problemi.push(`collegamento a un articolo che esce dopo questo (${href}): sarebbe un 404`);
    } else problemi.push(`collegamento interno sconosciuto: ${href}`);
  }

  // Immagini
  for (const [, alt, src] of corpo.matchAll(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    if (!alt.trim()) problemi.push(`immagine senza testo alternativo: ${src}`);
    if (src.startsWith("/") && !existsSync(path.join(PUBBLICA, src))) problemi.push(`immagine che non esiste: public${src}`);
    if (/^https?:/.test(src)) problemi.push(`immagine esterna (${src}): le immagini stanno in public/blog/${a.slug}/`);
  }
  if (i.immagine && !existsSync(path.join(PUBBLICA, i.immagine))) problemi.push(`copertina che non esiste: public${i.immagine}`);

  const parole = contaParole(a.corpo);
  if (parole < MINIMO_PAROLE) (i.bozza ? avvisi : problemi).push(`${parole} parole, sotto le ${MINIMO_PAROLE}`);

  // Doppioni: stesso titolo o stessa parola chiave di un altro articolo = due pagine che si rubano la ricerca.
  for (const b of letti) {
    if (b === a) continue;
    if (b.intestazione.titolo.toLowerCase() === i.titolo.toLowerCase()) problemi.push(`stesso titolo di ${b.slug}`);
    if (b.intestazione.parolaChiave.toLowerCase() === i.parolaChiave.toLowerCase()) problemi.push(`stessa parola chiave di ${b.slug} («${i.parolaChiave}»)`);
  }

  const stato = i.bozza ? "bozza" : i.data;
  if (problemi.length) {
    errori += problemi.length;
    console.error(`✗ ${a.slug} (${stato})`);
    for (const p of problemi) console.error(`    - ${p}`);
  } else {
    console.log(`✓ ${a.slug} (${stato}, ${parole} parole)`);
  }
  for (const p of avvisi) console.warn(`    ! ${p}`);
}

if (!letti.length && !errori) console.log("nessun articolo");
console.log(errori ? `\n${errori} errori` : "\nnessun errore");
process.exit(errori ? 1 : 0);
