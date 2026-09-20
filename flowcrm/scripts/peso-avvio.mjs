/**
 * Controllo del peso di avvio — eseguibile, non una frase in un documento.
 *
 * ── Perché non misura «la dimensione del chunk index» ───────────────
 * Il budget precedente (CONSEGNA-FRONTEND.md §4.2) fissava 429 kB per il
 * chunk `index`. Quel numero ha smesso di misurare ciò che intendeva nel
 * momento in cui sono state rese pigre le 26 pagine interne: rollup ha
 * ridisegnato i confini dei chunk, il client Supabase è finito dentro
 * `index` e react-router ne è uscito. Risultato: `index` da 429 a 637 kB
 * **mentre il carico reale scendeva da 1823 a 919 kB**. La soglia segnalava
 * un peggioramento durante un dimezzamento.
 *
 * «Quanto pesa il chunk che si chiama index» è il contenuto di una scatola
 * il cui perimetro decide il bundler: con lo stesso codice e un
 * `manualChunks` diverso si muove di 200 kB senza che un byte cambi posto
 * nella rete. Qui si misura invece ciò che il browser deve davvero scaricare
 * prima che si veda qualcosa:
 *
 *   il grafo degli import STATICI a partire dall'entry di index.html,
 *   più il chunk `App`, che `main.tsx` attende con `await import('./App')`
 *   prima di montare React — quindi pigro per rollup, obbligatorio per chi
 *   guarda lo schermo.
 *
 * ── Perché un delta e non un tetto ──────────────────────────────────
 * Un tetto fissato al numero di oggi fa fallire la prima aggiunta legittima,
 * e chi la subisce alza la soglia per sbloccarsi: a quel punto il controllo
 * è diventato la cosa che alza la soglia quando è scomoda. Qui il build
 * fallisce solo se si cresce oltre il MARGINE rispetto al numero registrato
 * in `peso-avvio.json`, e quel numero si aggiorna **nello stesso commit**
 * che lo fa crescere. Costringe a nominare la crescita, che è lo scopo.
 */
import { readFileSync, statSync, readdirSync, existsSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { join, dirname } from 'node:path'

/** Quanto si può crescere senza dover discutere. Oltre, il build si ferma. */
export const MARGINE = 0.05

/** Import statici di un chunk verso altri chunk. I dinamici NON contano. */
const STATICI = /(?:^|[;}\s])(?:import|export)[^"'()]*?["']\.\/([^"']+\.js)["']/g

function grafo(dirAssets, partenze) {
  const visti = new Set()
  const coda = [...partenze]
  while (coda.length) {
    const f = coda.pop()
    if (!f || visti.has(f)) continue
    visti.add(f)
    let sorgente
    try {
      sorgente = readFileSync(join(dirAssets, f), 'utf8')
    } catch {
      continue
    }
    for (const m of sorgente.matchAll(STATICI)) coda.push(m[1])
  }
  return visti
}

export function misura(dirDist) {
  const html = readFileSync(join(dirDist, 'index.html'), 'utf8')
  const entry = html.match(/src="\/assets\/([^"]+\.js)"/)?.[1]
  if (!entry) throw new Error('peso-avvio: entry non trovata in index.html')

  const dirAssets = join(dirDist, 'assets')
  // `App` è atteso prima del primo render: pigro per rollup, non per l'utente.
  const app = readdirSync(dirAssets).find((n) => /^App-[\w-]+\.js$/.test(n))
  if (!app) throw new Error('peso-avvio: chunk App non trovato — la misura sarebbe falsa')

  const file = grafo(dirAssets, [entry, app])
  let grezzo = 0
  let compresso = 0
  for (const f of file) {
    const p = join(dirAssets, f)
    grezzo += statSync(p).size
    compresso += gzipSync(readFileSync(p)).length
  }
  return { file: file.size, grezzo, compresso }
}

const kB = (n) => Math.round(n / 1024)

export function verifica(dirDist, percorsoRiferimento) {
  const ora = misura(dirDist)
  if (!existsSync(percorsoRiferimento)) {
    throw new Error(`peso-avvio: manca ${percorsoRiferimento}`)
  }
  const rif = JSON.parse(readFileSync(percorsoRiferimento, 'utf8'))
  const tetto = Math.round(rif.compresso * (1 + MARGINE))
  const riga =
    `peso di avvio: ${kB(ora.compresso)} kB gzip (${kB(ora.grezzo)} kB grezzi, ` +
    `${ora.file} file) — riferimento ${kB(rif.compresso)} kB, tetto ${kB(tetto)} kB`

  if (ora.compresso > tetto) {
    throw new Error(
      `${riga}\n\n` +
        `Il carico prima del primo render è cresciuto oltre il ${MARGINE * 100}%.\n` +
        `Se la crescita è voluta, aggiorna ${percorsoRiferimento} NELLO STESSO COMMIT\n` +
        `che la introduce, scrivendo in "perche" cosa l'ha causata. Se non lo è,\n` +
        `l'aggiunta è finita nel grafo statico invece che in un chunk pigro.\n` +
        `Per vedere chi occupa cosa: le sourcemap in dist/assets/*.js.map.`,
    )
  }
  return riga
}

/** Plugin di build: gira a ogni `vite build`, anche quello nudo della CI. */
export function controlloPesoAvvio(radice) {
  return {
    name: 'controllo-peso-avvio',
    apply: 'build',
    closeBundle() {
      const riga = verifica(join(radice, 'dist'), join(radice, 'peso-avvio.json'))
      this.info ? this.info(riga) : console.log(riga)
    },
  }
}

// Uso diretto: `node scripts/peso-avvio.mjs` (dopo un build).
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  const radice = join(dirname(new URL(import.meta.url).pathname.slice(1)), '..')
  console.log(verifica(join(radice, 'dist'), join(radice, 'peso-avvio.json')))
}
