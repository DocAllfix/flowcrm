import { z } from "zod";
import { CONTATTI_ATTIVI } from "@/lib/sito";

export const dynamic = "force-dynamic";

/**
 * La richiesta di presentazione. Stessa scelta motivata di
 * `evalisdeck/src/app/api/fondatori/route.ts`:
 *
 * ⚠️ NON SI SALVA NIENTE. La richiesta diventa un'email e basta: sono dati di persone
 * che non sono clienti, e conservarli vorrebbe dire un archivio, una conservazione e
 * una riga in più nell'informativa. Per poche richieste l'email è la risposta giusta.
 *
 * ⚠️ Non si dice «inviata» quando non è partita: senza chiave o con Resend in errore si
 * risponde 502, e il modulo lo mostra.
 *
 * Il freno di frequenza è IN MEMORIA, quindi approssimato: su Vercel ogni istanza ha
 * la sua e un avvio a freddo lo azzera. Basta contro chi insiste da una sola macchina;
 * trappola e tempo minimo fermano i robot più semplici. Se arriva abuso vero, si passa
 * a un contatore condiviso, non si allunga questo.
 */
const Schema = z.object({
  nome: z.string().trim().min(2).max(120),
  azienda: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(200),
  utenti: z.enum(["1-5", "6-15", "oltre-15"]),
  moduli: z.array(z.string().max(40)).max(5).default([]),
  motivo: z.enum(["presentazione", "appuntamento", "acquisto"]).default("presentazione"),
  messaggio: z.string().trim().max(2000).nullish().transform((v) => v ?? ""),
  sito: z.string().max(200).nullish(),
  trascorsi: z.number().nonnegative(),
});

const FINESTRA_MS = 3_600_000;
const MASSIMO = 5;
const TEMPO_MINIMO_MS = 3_000;
const invii = new Map<string, number[]>();

function frenato(ip: string): boolean {
  const adesso = Date.now();
  const recenti = (invii.get(ip) ?? []).filter((t) => adesso - t < FINESTRA_MS);
  recenti.push(adesso);
  invii.set(ip, recenti);
  return recenti.length > MASSIMO;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export async function POST(req: Request) {
  if (!CONTATTI_ATTIVI) return Response.json({ ok: false }, { status: 404 });

  const p = Schema.safeParse(await req.json().catch(() => null));
  if (!p.success) {
    return Response.json({ ok: false, errore: "Controlla i campi evidenziati e riprova." }, { status: 400 });
  }
  const d = p.data;

  // Robot: si ringrazia e non si manda niente. Dire «sei un robot» insegna a sembrarlo meno.
  if (d.sito || d.trascorsi < TEMPO_MINIMO_MS) return Response.json({ ok: true });

  const ip = (req.headers.get("x-forwarded-for") ?? "ignoto").split(",")[0]!.trim();
  if (frenato(ip)) {
    return Response.json({ ok: false, errore: "Hai già inviato diverse richieste: ti rispondiamo presto." }, { status: 429 });
  }

  const chiave = process.env.RESEND_API_KEY;
  const a = process.env.CONTATTI_DESTINATARIO;
  const da = process.env.CONTATTI_MITTENTE;
  if (!chiave || !a || !da) {
    console.error("contatti: RESEND_API_KEY, CONTATTI_DESTINATARIO o CONTATTI_MITTENTE mancanti");
    return Response.json({ ok: false, errore: "Il modulo non è raggiungibile in questo momento. Riprova più tardi." }, { status: 502 });
  }

  const righe: [string, string][] = [
    ["Motivo", d.motivo],
    ["Nome", d.nome],
    ["Azienda", d.azienda],
    ["Email", d.email],
    ["Utenti", d.utenti],
    ["Moduli", d.moduli.join(", ") || "nessuno indicato"],
    ["Messaggio", d.messaggio || "(vuoto)"],
  ];
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${chiave}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: da,
      to: [a],
      reply_to: d.email,
      subject: `PMIFlow · ${d.motivo} · ${d.azienda}`,
      text: righe.map(([k, v]) => `${k}: ${v}`).join("\n"),
      html: `<table>${righe.map(([k, v]) => `<tr><th align="left">${esc(k)}</th><td>${esc(v)}</td></tr>`).join("")}</table>`,
    }),
  }).catch(() => null);

  if (!r?.ok) {
    console.error("contatti: invio fallito", r?.status);
    return Response.json({ ok: false, errore: "Non siamo riusciti a inviare la richiesta. Riprova fra qualche minuto." }, { status: 502 });
  }
  return Response.json({ ok: true });
}
