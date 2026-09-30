/**
 * Il resoconto di un articolo scritto dall'agente, per la PR e per la mail:
 *   - la nota finale dell'agente (fonti non verificate, dubbi), dal file di esecuzione
 *     di claude-code-action;
 *   - lo stato di ogni collegamento esterno dell'articolo.
 *
 *   node landing/scripts/resoconto-agente.mjs <file di esecuzione> <articolo.md>
 *
 * Non blocca mai: stampa Markdown su stdout. Un collegamento che non risponde è un
 * avviso per il titolare, non un errore (i siti pubblici a volte sono lenti o hanno
 * certificati incompleti, e l'agente lo segnala già nella sua nota).
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { devNull } from "node:os";

const [esecuzione, articolo] = process.argv.slice(2);

function notaAgente() {
  if (!esecuzione || !existsSync(esecuzione)) return null;
  const testo = readFileSync(esecuzione, "utf8").trim();
  let messaggi = [];
  try {
    const dato = JSON.parse(testo);
    messaggi = Array.isArray(dato) ? dato : [dato];
  } catch {
    messaggi = testo.split("\n").flatMap((r) => {
      try {
        return [JSON.parse(r)];
      } catch {
        return [];
      }
    });
  }
  const risultato = messaggi.filter((m) => m?.type === "result" && typeof m.result === "string").at(-1);
  return risultato?.result?.trim() || null;
}

function statoCollegamento(url) {
  const prova = (extra) => {
    try {
      return execFileSync("curl", ["-s", "-o", devNull, "-w", "%{http_code}", "-L", "--max-time", "20", ...extra, url], { encoding: "utf8" }).trim();
    } catch {
      return "000";
    }
  };
  const codice = prova([]);
  if (codice !== "000") return { codice, certificato: true };
  const senzaCertificato = prova(["-k"]);
  return { codice: senzaCertificato, certificato: false };
}

const righe = [];
const nota = notaAgente();
righe.push("### Resoconto dell'agente", "");
righe.push(nota ? nota.split("\n").map((r) => `> ${r}`).join("\n") : "_Nessuna nota finale dell'agente._");

if (articolo && existsSync(articolo)) {
  const md = readFileSync(articolo, "utf8");
  const collegamenti = [...new Set([...md.matchAll(/\]\((https?:\/\/[^)\s]+)/g)].map((m) => m[1]))];
  righe.push("", "### Collegamenti esterni", "");
  if (!collegamenti.length) righe.push("_Nessuno._");
  for (const url of collegamenti) {
    const { codice, certificato } = statoCollegamento(url);
    const ok = /^[23]/.test(codice);
    if (ok && certificato) righe.push(`- ✓ ${url} (${codice})`);
    else if (ok) righe.push(`- ⚠️ ${url}: risponde (${codice}) ma con un certificato che il controllo non riconosce; aprilo tu per sicurezza`);
    else righe.push(`- ⚠️ **${url}: non risponde (${codice})**; va controllato prima dell'uscita`);
  }
}

console.log(righe.join("\n"));
