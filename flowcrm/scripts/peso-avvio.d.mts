/* Tipi per il controllo del peso di avvio.
 *
 * Lo script è `.mjs` e non `.ts` per una ragione: `vite.config.ts` lo importa
 * mentre Vite sta ancora caricando la propria configurazione, cioè prima che
 * esista una pipeline che compili TypeScript. Un `.ts` lì dentro funziona solo
 * grazie al pre-bundling della config, e si rompe quando lo si lancia a mano
 * con `node`. Le dichiarazioni stanno quindi qui accanto. */

export declare const MARGINE: number

export declare function misura(dirDist: string): {
  file: number
  grezzo: number
  compresso: number
}

export declare function verifica(dirDist: string, percorsoRiferimento: string): string

export declare function controlloPesoAvvio(radice: string): {
  name: string
  apply: 'build'
  closeBundle(): void
}
