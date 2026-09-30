/**
 * Aiuti deterministici per la redazione: le cose che un agente non deve «indovinare».
 *
 *   node scripts/redazione.mjs prossimo        # prima voce da scrivere + data libera, in JSON
 *   node scripts/redazione.mjs segna <slug> <data>   # la voce diventa «scritto» con quella data
 *   node scripts/redazione.mjs oggi            # quanti articoli escono oggi (per il rilascio del mattino)
 *
 * `REDAZIONE_IN_CORSO` (variabile, facoltativa): «slug@data,slug@data» degli articoli in
 * PR ancora aperte, anche quelle fermate con l'etichetta `fermo`. Su main la loro voce
 * risulta ancora da scrivere: senza questa lista l'agente riscriverebbe lo stesso
 * argomento, o userebbe la stessa data.
 *
 * La data: il primo giorno libero ad almeno TRE giorni da oggi (ora di Roma). Così la
 * PR resta aperta 48 ore (finestra di revisione del titolare) e l'articolo esce dopo.
 * «Libero» = nessun articolo nella cartella e nessuna voce del piano già con quella data.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseDocument } from "yaml";
import { oggiARoma, tuttiIFile } from "../src/lib/blog-schema.ts";

const qui = path.dirname(fileURLToPath(import.meta.url));
const PIANO = path.join(qui, "../redazione/piano.yaml");
const ANTICIPO_GIORNI = 3;

const IN_CORSO = (process.env.REDAZIONE_IN_CORSO ?? "")
  .split(",")
  .map((x) => x.trim().split("@"))
  .filter(([slug]) => slug);

const doc = parseDocument(readFileSync(PIANO, "utf8"));
const voci = doc.get("voci");

function dateOccupate() {
  const occupate = new Set(tuttiIFile(path.join(qui, "../src/contenuti/blog")).map((a) => a.intestazione.data));
  for (const v of voci.items) if (v.get("data")) occupate.add(String(v.get("data")));
  for (const [, data] of IN_CORSO) if (data) occupate.add(data);
  return occupate;
}

function primaDataLibera() {
  const occupate = dateOccupate();
  const d = new Date(`${oggiARoma()}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + ANTICIPO_GIORNI);
  while (occupate.has(d.toISOString().slice(0, 10))) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

const [comando, slug, data] = process.argv.slice(2);

if (comando === "prossimo") {
  const esistenti = new Set(readdirSync(path.join(qui, "../src/contenuti/blog")).map((n) => n.replace(/\.md$/, "")));
  for (const [slug] of IN_CORSO) esistenti.add(slug);
  const voce = voci.items.find((v) => v.get("stato") === "da-scrivere" && !esistenti.has(v.get("slug")));
  if (!voce) {
    console.log(JSON.stringify({ voce: null, motivo: "nessuna voce da scrivere nel piano" }));
    process.exit(0);
  }
  console.log(JSON.stringify({ voce: voce.toJSON(), data: primaDataLibera(), oggi: oggiARoma() }, null, 2));
} else if (comando === "segna" && slug && /^\d{4}-\d{2}-\d{2}$/.test(data ?? "")) {
  const voce = voci.items.find((v) => v.get("slug") === slug);
  if (!voce) {
    console.error(`nessuna voce con slug ${slug}`);
    process.exit(1);
  }
  voce.set("stato", "scritto");
  voce.set("data", data);
  writeFileSync(PIANO, doc.toString({ lineWidth: 0, flowCollectionPadding: false }));
  console.log(`${slug}: scritto, esce il ${data}`);
} else if (comando === "oggi") {
  const oggi = oggiARoma();
  const usciti = tuttiIFile(path.join(qui, "../src/contenuti/blog")).filter((a) => !a.intestazione.bozza && a.intestazione.data === oggi);
  console.log(usciti.length);
} else {
  console.error("uso: node scripts/redazione.mjs prossimo | segna <slug> <AAAA-MM-GG> | oggi");
  process.exit(1);
}
