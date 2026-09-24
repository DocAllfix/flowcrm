/**
 * Gate SEO della landing. Legge la sitemap e controlla ogni pagina servita:
 *
 *   node scripts/verifica-seo.mjs http://localhost:3417
 *
 * Per ogni URL della sitemap: 200, un solo h1, title e description presenti,
 * canonical su sé stessa, nessun noindex, JSON-LD che si analizza.
 * Su tutto l'HTML: NESSUN PREZZO (decisione del committente, 24/09/2026) e nessuna
 * lineetta lunga nel testo visibile.
 * Esce con 1 al primo errore; gli avvisi (dati legali mancanti) non bloccano.
 */
const BASE = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const CANONICO = "https://pmiflow.eu";
let errori = 0;
const errore = (m) => (errori++, console.error(`✗ ${m}`));
const bene = (m) => console.log(`✓ ${m}`);

const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text();
const percorsi = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(CANONICO, "") || "/");
if (!percorsi.length) errore("sitemap vuota");

const robots = await (await fetch(`${BASE}/robots.txt`)).text();
robots.includes(`Sitemap: ${CANONICO}/sitemap.xml`) ? bene("robots.txt dichiara la sitemap") : errore("robots.txt senza sitemap");

for (const percorso of [...percorsi, "/grazie"]) {
  const r = await fetch(`${BASE}${percorso}`);
  const html = await r.text();
  const indicizzabile = percorso !== "/grazie";
  if (r.status !== 200) { errore(`${percorso}: HTTP ${r.status}`); continue; }

  const h1 = (html.match(/<h1[\s>]/g) ?? []).length;
  if (h1 !== 1) errore(`${percorso}: ${h1} h1 invece di 1`);
  if (!/<title>[^<]{10,70}<\/title>/.test(html)) errore(`${percorso}: title assente o fuori misura`);
  const desc = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? "";
  if (indicizzabile && (desc.length < 70 || desc.length > 170)) errore(`${percorso}: description di ${desc.length} caratteri`);
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  const atteso = `${CANONICO}${percorso === "/" ? "" : percorso}`;
  if (canonical?.replace(/\/$/, "") !== atteso.replace(/\/$/, "")) errore(`${percorso}: canonical ${canonical} invece di ${atteso}`);
  const noindex = /<meta name="robots" content="[^"]*noindex/.test(html);
  if (indicizzabile && noindex) errore(`${percorso}: in sitemap ma noindex`);
  if (!indicizzabile && !noindex) errore(`${percorso}: dovrebbe essere noindex`);

  for (const [, blocco] of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(blocco); } catch { errore(`${percorso}: JSON-LD non valido`); }
  }

  // Niente prezzi: né il simbolo, né «EUR», né listini a parole.
  const visibile = html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "");
  // «Una volta al mese» non è un prezzo: si cercano valuta e cifre per periodo.
  if (/€|&euro;|\bEUR\b|\beuro\b|\d\s*\/\s*(mese|anno|utente)\b|listino prezzi/i.test(html)) errore(`${percorso}: contiene un prezzo o un riferimento di prezzo`);
  if (/—/.test(visibile.replace(/<[^>]+>/g, ""))) errore(`${percorso}: lineetta lunga nel testo visibile`);

  // Parola incollata a un tag in linea («Security</em>di»). Il compilatore JSX toglie lo
  // spazio iniziale di un testo su più righe quando contiene un'entità come &apos;:
  // in sorgente lo spazio c'è, nell'HTML no. Si vede solo guardando la pagina servita.
  const incollato = visibile.match(/<\/(strong|em|a|span|time)>[A-Za-zÀ-ú(]/);
  if (incollato) errore(`${percorso}: spazio mancante dopo un tag in linea («${incollato[0]}»)`);

  if (!errori) bene(`${percorso}`);
}

const home = await (await fetch(`${BASE}/`)).text();
if (!/P\. IVA/.test(home)) console.warn("! piede senza ragione sociale e P. IVA (pubblicato così per scelta del committente, 24/09/2026)");

console.log(errori ? `\n${errori} errori` : "\nnessun errore");
process.exit(errori ? 1 : 0);
