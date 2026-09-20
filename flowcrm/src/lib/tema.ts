/**
 * Tema e identità visiva dell'istanza cliente, applicati a RUNTIME.
 *
 * ── Il problema che risolve ─────────────────────────────────────────
 * `/config.json` porta `primaryColor`, `accentColor`, `logoUrl`,
 * `faviconUrl` e `appName` per ogni cliente. Fino a questa revisione
 * **nessuno di questi cinque campi dipingeva un pixel**: i colori non
 * erano usati da nessuna parte, il logo era un'icona fissa di lucide, la
 * favicon e il titolo della scheda dicevano «FlowCRM» a tutti. Cioè il
 * white-label esisteva nella configurazione e non sullo schermo.
 *
 * ── Perché si DERIVA invece di leggere più campi ────────────────────
 * `SchemaConfig` è `.strict()`: aggiungere chiavi a `/config.json`
 * significherebbe toccare anche `deploy/docker-entrypoint.sh` e il
 * playbook di provisioning. Qui si ricava tutto dai due colori che già
 * arrivano. Chi installa un cliente continua a scrivere due variabili
 * d'ambiente, non venti.
 *
 * ── Perché il contrasto si CALCOLA ──────────────────────────────────
 * Il colore lo sceglie il cliente, l'accessibilità no: `PRODUCT.md`
 * dichiara WCAG 2.2 AA vincolante. Con `--primary-foreground` fisso a
 * bianco, un cliente con primario giallo avrebbe bottoni illeggibili e
 * se ne accorgerebbe lui. Qui il testo sopra l'accento, l'anello di
 * focus e le velature si risolvono numericamente in OKLCH — dove la
 * lightness è percettiva, quindi una soglia vale per qualunque tinta.
 *
 * ── Perché un <style> e non style.setProperty ───────────────────────
 * Le proprietà scritte su `documentElement.style` sono in linea, quindi
 * batterebbero la regola `.dark` del foglio e il tema scuro resterebbe
 * coi colori del chiaro. Qui si inietta un foglio con **entrambi** i
 * blocchi, `:root` e poi `.dark`: a parità di specificità vince
 * l'ultimo, che è l'ordine giusto.
 */
import type { Config } from '@/config/app.config'

// ─────────────────────────────────────────────────────────────────────
// Colore: le sole conversioni che servono, senza dipendenze.
// ─────────────────────────────────────────────────────────────────────

interface Oklch {
  l: number
  c: number
  h: number
}

type Rgb = [number, number, number]

const aLineare = (c: number): number =>
  c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4

const daLineare = (c: number): number =>
  c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055

/** Accetta `#rgb`, `#rrggbb` e le stesse forme senza cancelletto. */
function leggiEsadecimale(valore: string): Rgb | null {
  const g = valore.trim().replace(/^#/, '')
  const esteso = g.length === 3 ? g.replace(/./g, (ch) => ch + ch) : g
  if (!/^[0-9a-fA-F]{6}$/.test(esteso)) return null
  return [
    parseInt(esteso.slice(0, 2), 16) / 255,
    parseInt(esteso.slice(2, 4), 16) / 255,
    parseInt(esteso.slice(4, 6), 16) / 255,
  ]
}

function rgbAOklch([r, g, b]: Rgb): Oklch {
  const rl = aLineare(r)
  const gl = aLineare(g)
  const bl = aLineare(b)
  const l_ = Math.cbrt(0.4122214708 * rl + 0.5363325363 * gl + 0.0514459929 * bl)
  const m_ = Math.cbrt(0.2119034982 * rl + 0.6806995451 * gl + 0.1073969566 * bl)
  const s_ = Math.cbrt(0.0883024619 * rl + 0.2817188376 * gl + 0.6299787005 * bl)
  const l = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_
  const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_
  const c = Math.hypot(a, bb)
  let h = (Math.atan2(bb, a) * 180) / Math.PI
  if (h < 0) h += 360
  return { l, c: c < 0.0005 ? 0 : c, h }
}

function oklchARgbGrezzo({ l, c, h }: Oklch): Rgb {
  const rad = (h * Math.PI) / 180
  const a = c * Math.cos(rad)
  const b = c * Math.sin(rad)
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    daLineare(4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_),
    daLineare(-1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_),
    daLineare(-0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_),
  ]
}

const dentroGamut = (rgb: Rgb): boolean =>
  rgb.every((v) => v >= -0.0015 && v <= 1.0015)

/**
 * Riduce la chroma finché il colore rientra nell'sRGB. Senza questo, una
 * tinta satura schiarita o scurita esce dal gamut e il browser la taglia
 * per canale, spostandone la tinta in modo imprevedibile.
 */
function inGamut(colore: Oklch): Oklch {
  let c = colore.c
  while (c > 0 && !dentroGamut(oklchARgbGrezzo({ ...colore, c }))) c -= 0.002
  return { ...colore, c: Math.max(0, c) }
}

const oklchARgb = (colore: Oklch): Rgb =>
  oklchARgbGrezzo(colore).map((v) => Math.min(1, Math.max(0, v))) as Rgb

const luminanza = ([r, g, b]: Rgb): number =>
  0.2126 * aLineare(r) + 0.7152 * aLineare(g) + 0.0722 * aLineare(b)

/** Rapporto di contrasto WCAG fra due colori OKLCH. */
function contrasto(a: Oklch, b: Oklch): number {
  const la = luminanza(oklchARgb(a))
  const lb = luminanza(oklchARgb(b))
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

const css = ({ l, c, h }: Oklch): string =>
  `oklch(${+l.toFixed(4)} ${+c.toFixed(4)} ${+h.toFixed(1)})`

/**
 * Cerca la lightness più vicina a `partenza` che raggiunge `bersaglio`
 * di contrasto su `fondo`, tenendo tinta e chroma. Prova prima a
 * scendere e poi a salire (o il contrario), e restituisce la soluzione
 * migliore: così il colore resta il più vicino possibile a quello voluto.
 */
function versoIlContrasto(
  base: Oklch,
  fondo: Oklch,
  bersaglio: number,
  scalaChroma = 1,
): Oklch {
  const c = base.c * scalaChroma
  let migliore: Oklch = inGamut({ ...base, c })
  let miglioreRapporto = contrasto(migliore, fondo)
  if (miglioreRapporto >= bersaglio) return migliore

  // Se il bersaglio non è raggiungibile — su un fondo di media luminosità
  // né il chiaro né lo scuro arrivano sempre a 4,6 — si restituisce il
  // colore PIÙ contrastato trovato, non quello di partenza. Prima di questa
  // correzione succedeva il contrario: la ricerca falliva in silenzio e
  // tornava il punto da cui era partita.
  let piuContrastato = migliore
  let rapportoMassimo = miglioreRapporto

  for (const passo of [-0.004, 0.004]) {
    for (let l = base.l + passo; l > 0.02 && l < 0.995; l += passo) {
      const candidato = inGamut({ l, c, h: base.h })
      const rapporto = contrasto(candidato, fondo)
      if (rapporto > rapportoMassimo) {
        piuContrastato = candidato
        rapportoMassimo = rapporto
      }
      if (rapporto >= bersaglio) {
        // Fra le due direzioni si tiene quella che si allontana meno.
        if (
          miglioreRapporto < bersaglio ||
          Math.abs(l - base.l) < Math.abs(migliore.l - base.l)
        ) {
          migliore = candidato
          miglioreRapporto = rapporto
        }
        break
      }
    }
  }
  return miglioreRapporto >= bersaglio ? migliore : piuContrastato
}

/**
 * Il bersaglio del testo è 4,6 e non 4,5. Il valore finisce arrotondato a
 * quattro decimali nel CSS e poi a 8 bit per canale nel browser, e mirando
 * esattamente a 4,5 si atterra a 4,49: misurato da axe in browser sul testo
 * delle fasi della pipeline, dopo che il calcolo in memoria diceva 4,5.
 */
const SOGLIA_TESTO = 4.6

/** Testo leggibile sopra `fondo`: sceglie da sé se andare chiaro o scuro. */
function testoSu(fondo: Oklch, bersaglio = SOGLIA_TESTO): Oklch {
  const chiaro = versoIlContrasto(
    { l: 0.985, c: Math.min(fondo.c * 0.03, 0.01), h: fondo.h },
    fondo,
    bersaglio,
  )
  const scuro = versoIlContrasto(
    { l: 0.3, c: Math.min(fondo.c * 0.35, 0.08), h: fondo.h },
    fondo,
    bersaglio,
  )
  const rc = contrasto(chiaro, fondo)
  const rs = contrasto(scuro, fondo)
  // A parità di riuscita si preferisce il testo chiaro, che su un pieno
  // colorato è la convenzione che gli utenti si aspettano.
  if (rc >= bersaglio && rs >= bersaglio) return rc >= rs * 0.85 ? chiaro : scuro
  return rc >= rs ? chiaro : scuro
}

// ─────────────────────────────────────────────────────────────────────
// Derivazione della palette
// ─────────────────────────────────────────────────────────────────────

/**
 * WCAG 1.4.11 chiede 3:1 per l'anello di focus. Si punta leggermente più
 * in alto perché il valore scritto nel foglio è arrotondato a quattro
 * decimali, e mirando esattamente a 3 si finisce a 2,99 — misurato in
 * browser sull'arancio di ripiego, non dedotto.
 */
const SOGLIA_ANELLO = 3.05

/** Neutri del tema chiaro: lightness e chroma fissi, tinta del cliente. */
const NEUTRI_CHIARI: Array<[string, number, number]> = [
  // [token, lightness, chroma]
  ['background', 0.977, 0.0042],
  ['card', 0.995, 0.002],
  ['popover', 0.995, 0.002],
  ['muted', 0.9616, 0.0053],
  ['foreground', 0.2794, 0.0299],
  ['card-foreground', 0.2794, 0.0299],
  ['popover-foreground', 0.2794, 0.0299],
  ['muted-foreground', 0.5153, 0.0317],
  ['border', 0.8707, 0.0203],
  ['input', 0.643, 0.0203],
  ['sidebar-background', 0.995, 0.002],
  ['sidebar-foreground', 0.4525, 0.0312],
  ['sidebar-border', 0.9033, 0.0151],
]

const NEUTRI_SCURI: Array<[string, number, number]> = [
  ['background', 0.2092, 0.0116],
  ['card', 0.2409, 0.0136],
  ['popover', 0.2409, 0.0136],
  ['muted', 0.2921, 0.0165],
  ['foreground', 0.9369, 0.007],
  ['card-foreground', 0.9369, 0.007],
  ['popover-foreground', 0.9369, 0.007],
  ['muted-foreground', 0.6891, 0.0231],
  ['border', 0.3315, 0.0182],
  ['input', 0.535, 0.0182],
  ['sidebar-background', 0.2409, 0.0136],
  ['sidebar-foreground', 0.7737, 0.0165],
  ['sidebar-border', 0.3123, 0.0168],
]

/**
 * I neutri prendono la tinta del marchio, non una via di mezzo.
 *
 * ⚠️ Qui prima c'era un'interpolazione «al 60% dalla tinta fredda di base
 * verso quella del cliente», che sembra più prudente e invece è sbagliata:
 * la tinta è un angolo, e il 60% di un arco atterra lontano da entrambi
 * gli estremi. Con un marchio arancione (34,6°) partendo da 236,5° il
 * percorso più corto passa per il magenta e i neutri finivano a 331°,
 * cioè **rosa**. Verificato in browser prima di correggerlo.
 *
 * Prendere la tinta del marchio è sia più semplice sia più giusto: la
 * chroma dei neutri sta fra 0,002 e 0,032, quindi la tinta non si legge
 * come colore — si legge come parentela con il marchio, che è lo scopo.
 */
const tintaNeutra = (hMarchio: number): number => hMarchio

function blocco(
  voci: Array<[string, string]>,
  selettore: string,
): string {
  const corpo = voci.map(([n, v]) => `  --${n}: ${v};`).join('\n')
  return `${selettore} {\n${corpo}\n}`
}

/** Calcola l'intero foglio del tema a partire dai due colori del cliente. */
export function derivaFoglio(primarioHex: string, accentoHex: string): string {
  const rgbPrimario = leggiEsadecimale(primarioHex)
  const rgbAccento = leggiEsadecimale(accentoHex)
  if (!rgbPrimario) return ''

  const marchio = rgbAOklch(rgbPrimario)
  const secondario = rgbAccento ? rgbAOklch(rgbAccento) : null

  // ── Tema chiaro ───────────────────────────────────────────────────
  const chiare: Array<[string, string]> = []
  const hNeutraC = tintaNeutra(marchio.h)
  const mappaChiara = new Map<string, Oklch>()
  for (const [token, l, c] of NEUTRI_CHIARI) {
    const colore = { l, c, h: hNeutraC }
    mappaChiara.set(token, colore)
    chiare.push([token, css(colore)])
  }

  const primarioC = inGamut(marchio)
  chiare.push(['primary', css(primarioC)])
  chiare.push(['primary-foreground', css(testoSu(primarioC))])
  chiare.push(['chart-1', css(primarioC)])

  // Velatura per hover e selezioni: la tinta del marchio, quasi tutta
  // slavata sulla carta.
  const accentoC = inGamut({
    l: 0.9629,
    c: Math.min(marchio.c * 0.09, 0.03),
    h: marchio.h,
  })
  chiare.push(['accent', css(accentoC)])
  chiare.push([
    'accent-foreground',
    css(versoIlContrasto({ ...marchio, l: 0.563 }, accentoC, 4.5)),
  ])

  // L'anello di focus deve stare sopra 3:1 sulla superficie adiacente
  // (WCAG 1.4.11): il primario a piena chiarezza spesso non ci arriva.
  const fondoC = mappaChiara.get('background')!
  // Il primario usato come TESTO su una superficie chiara: la tinta piena
  // spesso non regge 4,5:1 (l'arancio di ripiego sta a 3,02:1).
  chiare.push(['primary-testo', css(versoIlContrasto(marchio, fondoC, SOGLIA_TESTO))])
  chiare.push(['ring', css(versoIlContrasto(marchio, fondoC, SOGLIA_ANELLO))])
  chiare.push(['sidebar-ring', css(versoIlContrasto(marchio, fondoC, SOGLIA_ANELLO))])

  chiare.push(['sidebar-primary', css(primarioC)])
  chiare.push(['sidebar-primary-foreground', css(testoSu(primarioC))])
  chiare.push(['sidebar-accent', css(accentoC)])
  chiare.push([
    'sidebar-accent-foreground',
    css(versoIlContrasto({ ...marchio, l: 0.563 }, accentoC, 4.5)),
  ])

  if (secondario) {
    const sec = inGamut(secondario)
    chiare.push(['secondary', css(sec)])
    chiare.push(['secondary-foreground', css(testoSu(sec))])
  }

  // ── Tema scuro ────────────────────────────────────────────────────
  const scure: Array<[string, string]> = []
  const hNeutraS = tintaNeutra(marchio.h)
  const mappaScura = new Map<string, Oklch>()
  for (const [token, l, c] of NEUTRI_SCURI) {
    const colore = { l, c, h: hNeutraS }
    mappaScura.set(token, colore)
    scure.push([token, css(colore)])
  }

  // Su fondo notte una tinta scura sparisce: si porta la lightness in una
  // fascia visibile tenendo tinta e saturazione del marchio.
  const primarioS = inGamut({
    ...marchio,
    l: Math.min(0.82, Math.max(0.66, marchio.l + 0.06)),
  })
  scure.push(['primary', css(primarioS)])
  scure.push(['primary-foreground', css(testoSu(primarioS))])
  scure.push(['primary-testo', css(versoIlContrasto(primarioS, mappaScura.get('card')!, SOGLIA_TESTO))])
  scure.push(['chart-1', css(primarioS)])

  const accentoS = inGamut({
    l: 0.2951,
    c: Math.min(marchio.c * 0.34, 0.08),
    h: marchio.h,
  })
  scure.push(['accent', css(accentoS)])
  scure.push([
    'accent-foreground',
    css(versoIlContrasto({ ...marchio, l: 0.8065 }, accentoS, 4.5)),
  ])

  const fondoS = mappaScura.get('background')!
  scure.push(['ring', css(versoIlContrasto(primarioS, fondoS, SOGLIA_ANELLO))])
  scure.push(['sidebar-ring', css(versoIlContrasto(primarioS, fondoS, SOGLIA_ANELLO))])
  scure.push(['sidebar-primary', css(primarioS)])
  scure.push(['sidebar-primary-foreground', css(testoSu(primarioS))])
  scure.push(['sidebar-accent', css(accentoS)])
  scure.push([
    'sidebar-accent-foreground',
    css(versoIlContrasto({ ...marchio, l: 0.8065 }, accentoS, 4.5)),
  ])

  if (secondario) {
    // In scuro il secondario fa da testo e da superficie chiara: si
    // schiarisce, come tutto il resto.
    const sec = inGamut({ ...secondario, l: Math.max(0.72, secondario.l) })
    scure.push(['secondary', css(sec)])
    scure.push(['secondary-foreground', css(testoSu(sec))])
  }

  // `.dark` DOPO `:root`: stessa specificità, vince l'ultimo.
  return [blocco(chiare, ':root'), blocco(scure, '.dark')].join('\n\n')
}

/** Legge `oklch(l c h)` come lo scrivono i token e il browser. */
function leggiOklch(valore: string): Oklch | null {
  const m = valore.trim().match(/^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)/)
  if (!m) return null
  const l = Number(m[1]) / (m[2] === '%' ? 100 : 1)
  return { l, c: Number(m[3]), h: Number(m[4]) }
}

/**
 * Colore di testo leggibile sopra un fondo che NON decide il design system.
 *
 * ── Perché esiste ───────────────────────────────────────────────────
 * Le fasi della pipeline, i professionisti dell'agenda e altre entità
 * hanno un colore scelto dall'utente e salvato nel database. Sei punti
 * del prodotto ci scrivevano sopra `text-white` fisso. La scansione axe
 * sulle pagine interne, girata per la prima volta su uno stack con
 * credenziali, li ha trovati: «Proposta» bianco su #3b82f6 a 3,67:1,
 * «Vinto» bianco su #10b981 a 2,53:1. Un token qui non basta, perché il
 * colore è un dato: il testo va calcolato, con la stessa funzione che
 * calcola il testo sul primario del cliente.
 *
 * Accetta un esadecimale, un `oklch(...)` o un riferimento `var(--token)`
 * (risolto sul documento al momento della chiamata). Se non riesce a
 * leggere il colore restituisce l'inchiostro del tema, che è la scelta
 * meno dannosa.
 */
export function coloreTestoLeggibile(colore: string | null | undefined): string {
  if (!colore) return 'var(--primary-foreground)'
  const pulito = colore.trim()
  if (/^var\(--(color-)?primary\)$/.test(pulito)) return 'var(--primary-foreground)'

  let risolto = pulito
  const riferimento = pulito.match(/^var\((--[a-z0-9-]+)\)$/)
  if (riferimento) {
    if (typeof document === 'undefined') return 'var(--foreground)'
    risolto = getComputedStyle(document.documentElement)
      .getPropertyValue(riferimento[1])
      .trim()
  }

  const rgb = leggiEsadecimale(risolto)
  const fondo = rgb ? rgbAOklch(rgb) : leggiOklch(risolto)
  if (!fondo) return 'var(--foreground)'
  return css(testoSu(inGamut(fondo)))
}

const ID_FOGLIO = 'tema-cliente'

/**
 * Scrive il tema del cliente nel documento. Va chiamata DOPO
 * `caricaConfigurazione()` e PRIMA che React monti, così non c'è un
 * lampo con i colori del prodotto al posto di quelli del cliente.
 */
export function applicaTemaCliente(config: Config): void {
  const foglio = derivaFoglio(config.primaryColor, config.accentColor)
  if (!foglio) {
    // Un colore illeggibile non deve fermare l'istanza: si resta sui
    // valori di ripiego del foglio di stile, che sono già verificati.
    console.warn(
      `[tema] primaryColor "${config.primaryColor}" non è un colore esadecimale valido: ` +
        `l'istanza parte con la palette di ripiego.`,
    )
    return
  }

  let stile = document.getElementById(ID_FOGLIO)
  if (!stile) {
    stile = document.createElement('style')
    stile.id = ID_FOGLIO
    document.head.appendChild(stile)
  }
  stile.textContent = foglio
}

/**
 * Titolo della scheda e favicon dell'istanza. Senza questa, la scheda del
 * browser di ogni cliente diceva «FlowCRM» e mostrava la nostra icona.
 */
export function applicaIdentitaCliente(config: Config): void {
  document.title = config.appName

  if (!config.faviconUrl) return
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  // Il tipo va rimosso quando cambia il formato: un `type` sbagliato fa
  // scartare l'icona in silenzio.
  link.removeAttribute('type')
  link.href = config.faviconUrl
}
