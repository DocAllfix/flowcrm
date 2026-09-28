import { z } from "zod";
import nodemailer from "nodemailer";
import { CONTATTI_ATTIVI, EMAIL_CONTATTI } from "@/lib/sito";

export const dynamic = "force-dynamic";
// nodemailer parla SMTP: serve Node, non il runtime edge.
export const runtime = "nodejs";

/**
 * La richiesta di presentazione, dal sito E dalla demo (`origine`).
 *
 * ⚠️ NON SI SALVA NIENTE. La richiesta diventa un'email e basta: sono dati di persone
 * che non sono clienti, e conservarli vorrebbe dire un archivio in più da dichiarare.
 *
 * ⚠️ Spedisce con l'SMTP di Hostinger, con le credenziali della casella che riceve
 * (`contatti@pmiflow.eu`): nessun servizio di terze parti in più, e SPF/DKIM del dominio
 * passano perché mittente e server sono gli stessi della casella.
 *
 * ⚠️ NIENTE risposta automatica al visitatore: una mail mandata a un indirizzo scritto da
 * chiunque trasformerebbe il modulo in un modo per spedire posta a terzi.
 *
 * ⚠️ Non si dice «inviata» quando non è partita: senza credenziali o con l'SMTP in
 * errore si risponde 502, e il modulo lo mostra.
 *
 * Freni: campo trappola, tempo minimo di compilazione, limite per IP e un TETTO GLOBALE
 * orario (un robot da tanti indirizzi non riempie la casella). Sono IN MEMORIA, quindi
 * approssimati: su Vercel ogni istanza ha i suoi. Se arriva abuso vero, si passa a un
 * contatore condiviso, non si allungano questi.
 */
const Schema = z.object({
  nome: z.string().trim().min(2).max(120),
  azienda: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(200),
  utenti: z.enum(["1-5", "6-15", "oltre-15"]),
  moduli: z.array(z.string().max(40)).max(5).default([]),
  motivo: z.enum(["presentazione", "appuntamento", "acquisto"]).default("presentazione"),
  messaggio: z.string().trim().max(2000).nullish().transform((v) => v ?? ""),
  origine: z.enum(["sito", "demo"]).default("sito"),
  sito: z.string().max(200).nullish(),
  trascorsi: z.number().nonnegative(),
});

/** Le sole pagine che possono chiamare questa rotta dal browser. */
const ORIGINI = new Set(["https://pmiflow.eu", "https://demo.pmiflow.eu"]);

const FINESTRA_MS = 3_600_000;
const MASSIMO_PER_IP = 5;
const MASSIMO_GLOBALE = 30;
const TEMPO_MINIMO_MS = 3_000;
const invii = new Map<string, number[]>();
let globali: number[] = [];

function frenato(ip: string): "ip" | "globale" | null {
  const adesso = Date.now();
  globali = globali.filter((t) => adesso - t < FINESTRA_MS);
  if (globali.length >= MASSIMO_GLOBALE) return "globale";
  const recenti = (invii.get(ip) ?? []).filter((t) => adesso - t < FINESTRA_MS);
  if (recenti.length >= MASSIMO_PER_IP) return "ip";
  recenti.push(adesso);
  invii.set(ip, recenti);
  globali.push(adesso);
  return null;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Intestazioni CORS solo per le nostre origini: le altre non ricevono niente. */
function cors(req: Request): Record<string, string> {
  const o = req.headers.get("origin");
  if (!o || !ORIGINI.has(o)) return {};
  return {
    "Access-Control-Allow-Origin": o,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

export function OPTIONS(req: Request) {
  const h = cors(req);
  return new Response(null, { status: Object.keys(h).length ? 204 : 403, headers: h });
}

export async function POST(req: Request) {
  const h = cors(req);
  const risposta = (corpo: unknown, status = 200) => Response.json(corpo, { status, headers: h });

  if (!CONTATTI_ATTIVI) return risposta({ ok: false }, 404);

  // Dal browser arriva sempre un'origine: se c'è e non è nostra, si rifiuta.
  const origine = req.headers.get("origin");
  if (origine && !ORIGINI.has(origine)) return risposta({ ok: false }, 403);

  const p = Schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return risposta({ ok: false, errore: "Controlla i campi evidenziati e riprova." }, 400);
  const d = p.data;

  // Robot: si ringrazia e non si manda niente. Dire «sei un robot» insegna a sembrarlo meno.
  if (d.sito || d.trascorsi < TEMPO_MINIMO_MS) return risposta({ ok: true });

  const ip = (req.headers.get("x-forwarded-for") ?? "ignoto").split(",")[0]!.trim();
  const freno = frenato(ip);
  if (freno === "ip") return risposta({ ok: false, errore: "Hai già inviato diverse richieste: ti rispondiamo presto." }, 429);
  if (freno === "globale") return risposta({ ok: false, errore: "Troppe richieste in questo momento. Riprova fra poco." }, 429);

  const utente = process.env.SMTP_USER;
  const password = process.env.SMTP_PASS;
  if (!utente || !password) {
    console.error("contatti: SMTP_USER o SMTP_PASS mancanti");
    return risposta({ ok: false, errore: "Il modulo non è raggiungibile in questo momento. Riprova più tardi." }, 502);
  }

  const righe: [string, string][] = [
    ["Da", d.origine === "demo" ? "demo pubblica" : "sito"],
    ["Motivo", d.motivo],
    ["Nome", d.nome],
    ["Azienda", d.azienda],
    ["Email", d.email],
    ["Utenti", d.utenti],
    ["Moduli", d.moduli.join(", ") || "nessuno indicato"],
    ["Messaggio", d.messaggio || "(vuoto)"],
  ];

  try {
    const posta = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? "smtp.hostinger.com",
      port: Number(process.env.SMTP_PORT ?? 465),
      secure: true,
      auth: { user: utente, pass: password },
    });
    await posta.sendMail({
      from: { name: d.origine === "demo" ? "PMIFlow · demo" : "PMIFlow · sito", address: utente },
      to: EMAIL_CONTATTI,
      replyTo: { name: d.nome, address: d.email },
      subject: `${d.origine === "demo" ? "[demo] " : ""}Richiesta di ${d.motivo} · ${d.azienda}`,
      text: righe.map(([k, v]) => `${k}: ${v}`).join("\n"),
      html: `<table cellpadding="4">${righe.map(([k, v]) => `<tr><th align="left">${esc(k)}</th><td>${esc(v)}</td></tr>`).join("")}</table>`,
    });
  } catch (e) {
    console.error("contatti: invio fallito", (e as Error).message);
    return risposta({ ok: false, errore: "Non siamo riusciti a inviare la richiesta. Riprova fra qualche minuto." }, 502);
  }
  return risposta({ ok: true });
}
