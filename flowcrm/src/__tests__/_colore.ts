/**
 * Aiuti di colore condivisi fra le guardie sui token e sul tema derivato.
 *
 * Non è un file di test (niente `.test.ts`): vitest non lo raccoglie, e
 * `tsconfig.test.json` lo typechecka insieme ai test.
 */

export type Rgb = [number, number, number]

/** OKLCH → sRGB (0–1), con taglio al gamut come fa il browser. */
export function oklchToRgb(l: number, c: number, hDeg: number): Rgb {
  const h = (hDeg * Math.PI) / 180
  const a = c * Math.cos(h)
  const b = c * Math.sin(h)
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ].map((v) => {
    const g = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055
    return Math.min(1, Math.max(0, g))
  }) as Rgb
}

export const luminanza = ([r, g, b]: Rgb): number => {
  const f = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

export const contrasto = (a: Rgb, b: Rgb): number => {
  const la = luminanza(a)
  const lb = luminanza(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/**
 * Estrae i token `--nome: oklch(l c h)` dal blocco che comincia con
 * `selettore` dentro un foglio di stile.
 */
export function tokenDelBlocco(css: string, selettore: string): Map<string, Rgb> {
  const inizio = css.indexOf(selettore + ' {')
  if (inizio === -1) throw new Error(`blocco ${selettore} non trovato`)
  const chiusura = css.indexOf('\n}', inizio)
  const chiusuraRientrata = css.indexOf('\n  }', inizio)
  const fine = [chiusura, chiusuraRientrata].filter((i) => i !== -1).sort((a, b) => a - b)[0]
  const corpo = css.slice(inizio, fine === undefined ? undefined : fine)

  const mappa = new Map<string, Rgb>()
  const re = /(--[a-z0-9-]+):\s*oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(corpo))) {
    mappa.set(m[1], oklchToRgb(Number(m[2]), Number(m[3]), Number(m[4])))
  }
  return mappa
}
