/**
 * Helper Zod riusabili per i form FlowCRM (kernel CertDesk).
 *
 * Convenzioni:
 * - Campi obbligatori con messaggi in italiano
 * - Limiti caratteri su campi testo libero (note: 2000, messaggi: 5000)
 * - Validazione formato (email, P.IVA, CAP)
 * - Trim automatico via z.string().trim()
 *
 * Gli schemi di dominio (organizzazioni, deal, ...) vengono aggiunti
 * fase per fase accanto ai rispettivi form — qui solo i mattoni comuni.
 */
import { z } from 'zod'

// ── Helpers riusabili ────────────────────────────────────────────

/** Stringa opzionale trim (per campi DB nullable). */
export const optStr = z.string().trim().optional()

/** Stringa opzionale con validazione email. Accetta vuoto/null. */
export const optEmail = z.union([
  z.string().trim().pipe(z.string().email('Email non valida')),
  z.literal(''),
  z.null(),
]).optional()

/** Campo note: max 2000 caratteri. */
export const noteField = z.string().trim().max(2000, 'Massimo 2000 caratteri').optional()

/** Campo messaggio/testo lungo: max 5000 caratteri. */
export const messaggioField = z.string().trim().min(1, 'Il messaggio è obbligatorio').max(5000, 'Massimo 5000 caratteri')

// ── P.IVA italiana ───────────────────────────────────────────────
// 11 cifre numeriche, opzionale con prefisso IT

const pivaRegex = /^(?:IT)?\d{11}$/

export const optPiva = z.union([
  z.string().trim().refine(
    (v) => v === '' || pivaRegex.test(v),
    { message: 'P.IVA non valida: deve essere di 11 cifre (es. 01234567890 o IT01234567890)' }
  ),
  z.null(),
]).optional()

// ── CAP italiano ─────────────────────────────────────────────────

const capRegex = /^\d{5}$/

export const optCap = z.union([
  z.string().trim().refine(
    (v) => v === '' || capRegex.test(v),
    { message: 'CAP non valido: deve essere di 5 cifre' }
  ),
  z.null(),
]).optional()
