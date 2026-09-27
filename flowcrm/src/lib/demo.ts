/**
 * Testo unico del blocco in versione dimostrativa. Deve combaciare con il
 * messaggio sollevato dal trigger `blocca_scrittura_demo()` nel database, così
 * che sia coerente sia quando lo mostriamo noi (bottoni disabilitati) sia
 * quando arriva dall'errore Postgres di una scrittura tentata.
 */
export const MESSAGGIO_DEMO =
  'Funzione disponibile solo nella versione completa. Contatta per attivarla.'

/**
 * DEMO PUBBLICA «prova vera»: ingresso con un clic dalla landing, senza digitare
 * credenziali (piano del 27/09/2026, modello di Legisboard).
 *
 * Le credenziali dell'account ospite arrivano da variabili inserite AL BUILD solo
 * nel progetto Vercel della demo: su un'istanza cliente non esistono, e la rotta
 * `/demo` non fa nulla. Sono leggibili nel bundle di proposito: ogni permesso
 * dell'ospite sta nel database (`scrittura_demo_rifiutata`, regole dei file,
 * blocco credenziali), non qui.
 *
 * L'accesso si fa nel BROWSER e non da una funzione server: i limiti di GoTrue
 * sono per IP, e da un server arriverebbero tutti dagli stessi pochi indirizzi.
 */
export const DEMO_PUBBLICA = {
  email: import.meta.env.VITE_DEMO_PUBBLICA_EMAIL ?? '',
  password: import.meta.env.VITE_DEMO_PUBBLICA_PASSWORD ?? '',
  /** Dove torna il visitatore che esce o clicca «Torna al sito». */
  sito: import.meta.env.VITE_DEMO_PUBBLICA_SITO ?? 'https://pmiflow.eu',
} as const

export function demoPubblicaAttiva(): boolean {
  return Boolean(DEMO_PUBBLICA.email && DEMO_PUBBLICA.password)
}
