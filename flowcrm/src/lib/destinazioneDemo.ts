import { NAV_SECTIONS, type NavSection } from '@/config/nav.config'
import { moduliAttivi } from '@/config/moduli.config'

/**
 * Dove porta l'ingresso della demo pubblica dopo l'accesso: `/demo?vai=/cantieri`.
 * Le pagine di settore di pmiflow.eu aprono così il modulo di cui parlano.
 *
 * ⚠️ Si accetta SOLO un percorso identico a una voce del menu (nucleo più moduli
 * attivi), mai un indirizzo costruito: niente `//altrosito`, niente `https://…`,
 * niente parametri. Tutto il resto porta al cruscotto. Un reindirizzamento aperto
 * su un dominio nostro sarebbe un regalo per chi fa phishing.
 */
export function destinazioneSicura(vai: string | null, ammessi: Iterable<string>): string {
  if (!vai || !vai.startsWith('/') || vai.startsWith('//')) return '/'
  return new Set(ammessi).has(vai) ? vai : '/'
}

function percorsiDelMenu(sezioni: NavSection[]): string[] {
  return sezioni.flatMap((s) => s.items.map((i) => i.path))
}

export function destinazioneDemo(vai: string | null): string {
  const sezioni = [...NAV_SECTIONS, ...moduliAttivi().flatMap((m) => m.nav)]
  return destinazioneSicura(vai, percorsiDelMenu(sezioni))
}
