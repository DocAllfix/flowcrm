/**
 * La mail che avvisa il titolare di un articolo scritto dall'agente di redazione, con la
 * PR da leggere e il modo di fermarlo. La lancia `.github/workflows/redazione.yml`.
 *
 *   SMTP_USER=… SMTP_PASS=… node scripts/avvisa-articolo.mjs <slug> <url della PR>
 *
 * Spedisce con la stessa casella del modulo contatti, a sé stessa.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import nodemailer from "nodemailer";
import { leggiArticolo } from "../src/lib/blog-schema.ts";

const qui = path.dirname(fileURLToPath(import.meta.url));
const [slug, pr] = process.argv.slice(2);
if (!slug || !pr) {
  console.error("uso: node scripts/avvisa-articolo.mjs <slug> <url della PR>");
  process.exit(1);
}
const { SMTP_USER, SMTP_PASS } = process.env;
if (!SMTP_USER || !SMTP_PASS) {
  console.error("SMTP_USER o SMTP_PASS mancanti: mail non inviata");
  process.exit(0);
}

const file = `${slug}.md`;
const a = leggiArticolo(file, readFileSync(path.join(qui, "../src/contenuti/blog", file), "utf8"));
const i = a.intestazione;
const data = new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${i.data}T00:00:00Z`));

const testo = [
  `Nuovo articolo per il blog di PMIFlow, firmato con il tuo nome:`,
  ``,
  `  ${i.titolo}`,
  `  ${i.descrizione}`,
  ``,
  `Esce ${data}, da solo, se nelle prossime 48 ore non lo fermi.`,
  ``,
  `Leggilo qui (nella PR c'è anche l'anteprima di Vercel):`,
  `  ${pr}`,
  ``,
  `Per fermarlo: nella PR metti l'etichetta «fermo», oppure chiudi la PR.`,
  `Per correggerlo: modifica il file nella PR, i controlli ripartono da soli.`,
  // Il resoconto dell'agente (fonti non verificate, collegamenti) senza i segni Markdown.
  ...(process.env.RESOCONTO_FILE && existsSync(process.env.RESOCONTO_FILE)
    ? ["", "----", "", readFileSync(process.env.RESOCONTO_FILE, "utf8").replace(/[*#>_]/g, "").trim()]
    : []),
].join("\n");

await nodemailer
  .createTransport({ host: process.env.SMTP_HOST ?? "smtp.hostinger.com", port: 465, secure: true, auth: { user: SMTP_USER, pass: SMTP_PASS } })
  .sendMail({
    from: { name: "PMIFlow · redazione", address: SMTP_USER },
    to: process.env.EMAIL_REDAZIONE ?? SMTP_USER,
    subject: `[blog] Esce ${data}: ${i.titolo}`,
    text: testo,
  });
console.log(`mail inviata per ${slug}`);
