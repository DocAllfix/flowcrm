/**
 * Scatta le schermate dell'anteprima dalla DEMO, sempre allo stesso modo, così si
 * rifanno in un comando quando l'app cambia.
 *
 *   SCATTI_EMAIL=… SCATTI_PASSWORD=… SCATTI_AGENTE_EMAIL=… SCATTI_AGENTE_PASSWORD=… \
 *     node scripts/scatta-schermate.mjs [https://flowcrm-orcin.vercel.app]
 *
 * Le credenziali arrivano dall'ambiente e non si scrivono mai qui: questo file è
 * versionato. Si naviga e basta, nessun clic che scrive.
 *
 * ⚠️ Dopo lo scatto si GUARDANO le immagini prima del commit: la demo contiene dati
 * di prova, ma finiscono su una pagina pubblica e il controllo non si salta.
 *
 * Playwright non è una dipendenza della landing: si usa quello di `flowcrm/`.
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

const qui = path.dirname(fileURLToPath(import.meta.url));
const richiedi = createRequire(path.join(qui, "../../flowcrm/package.json"));
const { chromium } = richiedi("@playwright/test");

const BASE = process.argv[2] ?? "https://flowcrm-orcin.vercel.app";
const USCITA = path.join(qui, "../public/schermate");

const SCATTI = [
  { nome: "dashboard", utente: "admin", percorso: "/" },
  { nome: "pipeline", utente: "admin", percorso: "/kanban" },
  { nome: "commessa", utente: "admin", percorso: "/commesse", primaRiga: true },
  { nome: "agente", utente: "agente", percorso: "/" },
];

const credenziali = {
  admin: [process.env.SCATTI_EMAIL, process.env.SCATTI_PASSWORD],
  agente: [process.env.SCATTI_AGENTE_EMAIL, process.env.SCATTI_AGENTE_PASSWORD],
};

const browser = await chromium.launch();
for (const [utente, [email, password]] of Object.entries(credenziali)) {
  if (!email || !password) throw new Error(`Credenziali mancanti per «${utente}»`);
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: "it-IT" });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await p.fill('input[type="email"]', email);
  await p.fill('input[type="password"]', password);
  await p.click('button[type="submit"]');
  await p.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30000 });

  for (const s of SCATTI.filter((x) => x.utente === utente)) {
    await p.goto(`${BASE}${s.percorso}`, { waitUntil: "networkidle" });
    if (s.primaRiga) {
      await p.locator('a[href^="/commesse/"]').first().click();
      await p.waitForLoadState("networkidle");
    }
    await p.waitForTimeout(1500); // grafici e scheletri di caricamento
    const png = await p.screenshot({ type: "png" });
    await sharp(png).webp({ quality: 82 }).toFile(path.join(USCITA, `${s.nome}.webp`));
    await sharp(png).avif({ quality: 55 }).toFile(path.join(USCITA, `${s.nome}.avif`));
    console.log(`✓ ${s.nome}  (${p.url().replace(BASE, "")})`);
  }
  await ctx.close();
}
await browser.close();
