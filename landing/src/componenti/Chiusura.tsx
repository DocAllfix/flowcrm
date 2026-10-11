import { CONTATTI_ATTIVI, DEMO_ATTIVA, URL_DEMO, IMPRESA, LEGALI_AGGIORNATI_AL, datiImpresa, hrefTelefono } from "@/lib/sito";
import { MODULI } from "@/contenuti/moduli";
import { blogNelMenu } from "@/lib/blog";
import { Logotipo } from "./Intestazione";

/**
 * L'unico blocco pieno di colore della pagina, come nei manifesti Olivetti: il cotto
 * copre la fascia intera una volta sola, ed è per questo che si nota. Testo in carta:
 * contrasto 5.2:1 (AA).
 */
/** `contatti`: dove sta il modulo. Nella home è sulla pagina; altrove si torna alla home. */
export function ChiamataFinale({ contatti = "/#contatti" }: { contatti?: string } = {}) {
  if (!CONTATTI_ATTIVI && !DEMO_ATTIVA) return null;
  return (
    <section aria-labelledby="titolo-finale" className="bg-cotto text-carta">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-8 px-4 py-20 sm:px-6 md:flex-row md:items-end md:justify-between md:py-24">
        <h2 id="titolo-finale" className="titolo-sezione max-w-2xl">
          Mezz&apos;ora per capire se fa per voi.
        </h2>
        {/* Qui il pulsante è la presentazione (la sezione parla di quella) e la demo è
            il collegamento: l'inverso dell'hero, stesso schema. */}
        <div className="flex flex-wrap items-center gap-x-8 gap-y-5">
          {CONTATTI_ATTIVI ? (
            <>
              <a href={contatti} className="bottone bottone-due-righe bg-carta text-inchiostro hover:bg-foglio">
                Richiedi una presentazione
                {" "}
                <span className="sotto">Ti scriviamo noi per fissarla</span>
              </a>
              {DEMO_ATTIVA && (
                <a href={URL_DEMO} className="collegamento-cta decoration-carta/55 hover:decoration-carta">
                  oppure entra nella demo
                </a>
              )}
            </>
          ) : (
            <a href={URL_DEMO} className="bottone bottone-due-righe bg-carta text-inchiostro hover:bg-foglio">
              Entra nella demo
              {" "}
              <span className="sotto">Un clic, senza registrazione</span>
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

const COLONNE = [
  ["Prodotto", [["Funzioni", "/#funzioni"], ["Moduli di settore", "/#moduli"], ["Come si parte", "/#come-si-parte"], ["Domande", "/#domande"]]],
  ["Moduli", [["Tutti i moduli", "/moduli"], ...MODULI.map((m) => [m.nome, `/moduli/${m.id}`] as const)]],
  ["Fiducia", [["Sicurezza e dati", "/sicurezza"]]],
  ["Legale", [["Privacy", "/privacy"], ["Cookie", "/cookie"], ["Termini", "/termini"]]],
] as const;

/**
 * Il piede, su ogni pagina: è qui che stanno i dati legali dell'impresa (art. 7 d.lgs.
 * 70/2003, P. IVA in home per l'art. 35 DPR 633/1972; vedi `IMPRESA` in lib/sito.ts).
 * Si stampano quando esistono, e finché mancano `verifica-seo.mjs` lo segnala invece
 * di lasciar passare un piede vuoto.
 */
/**
 * La firma di chi ha sviluppato PMIFlow, in fondo a ogni pagina pubblica.
 *
 * ⚠️ Il collegamento è DOFOLLOW di proposito: niente `nofollow`, `sponsored` né `ugc`.
 * Non è un refuso e non va «corretto» da chi passa di qui: è una scelta del titolare,
 * che possiede entrambi i siti. `rel` porta solo `noopener`, che serve alla sicurezza
 * di `target="_blank"` e non tocca l'indicizzazione.
 *
 * Il tracciato principale del marchio è quasi nero (#14171c) e sul fondo notte del
 * piede sparirebbe. Non va messo su una piastrella chiara (prima stesura, scartata):
 * la variante per fondi scuri la indica Axialoop stessa — quella parte prende
 * `currentColor`, quindi il colore del testo accanto, mentre blu e verde restano i
 * loro. Così il marchio si vede senza essere ritinto a nostro gusto.
 *
 * Il nome è TESTO, non parte dell'immagine: un'immagine non si legge né si traduce.
 *
 * L'`aria-label` RIPETE il testo visibile prima di aggiungere il resto, e non è una
 * ridondanza: WCAG 2.5.3 «Label in Name» chiede che il nome accessibile contenga
 * l'etichetta visibile. Chi usa i comandi vocali dice quello che legge — «powered by
 * Axialoop» — e con un nome che non comincia così il collegamento non si attiva.
 */
function FirmaAxialoop() {
  return (
    <a
      href="https://www.axialoop.com/it"
      target="_blank"
      rel="noopener"
      aria-label="powered by Axialoop: sito di Axialoop, che ha sviluppato PMIFlow (si apre in una nuova scheda)"
      className="inline-flex shrink-0 items-center gap-2 py-1 text-[0.9375rem] hover:text-carta"
    >
      <svg viewBox="0 0 497 494" className="size-4.5 shrink-0" aria-hidden="true">
          <path fill="currentColor" fillRule="evenodd" d="M247 4 L139 67 L137 161 L5 238 L4 348 L210 470 L251 490 L492 350 L493 238 L358 158 L358 67 Z M245 231 L248 243 L347 301 L250 358 L197 328 L197 260 Z" />
          <path fill="#5683a9" d="M428 317 L377 290 L256 362 L307 389 L428 320 Z M142 293 L190 323 L193 322 L192 265 Z M10 245 L10 347 L201 459 L246 482 L246 428 L62 321 L60 274 Z M361 231 L355 240 L308 269 L308 272 L349 296 L376 283 L376 241 Z M360 167 L360 224 L434 267 L484 240 Z M246 75 L199 101 L199 188 L246 161 Z M148 67 L193 95 L204 92 L248 66 L301 96 L350 69 L250 9 Z" />
          <path fill="#7cbb84" d="M70 317 L248 422 L297 395 L290 388 L120 289 Z M382 246 L383 284 L432 311 L432 273 Z M188 193 L138 166 L17 236 L15 240 L66 267 L183 199 Z M252 76 L253 240 L300 265 L300 103 Z M144 75 L144 159 L193 187 L193 103 Z" />
      </svg>
      <span>
        powered by <span className="font-semibold">Axialoop</span>
      </span>
    </a>
  );
}

export function Piede() {
  const anno = LEGALI_AGGIORNATI_AL.slice(0, 4);
  const legali = datiImpresa();
  return (
    <footer className="sezione-notte bg-notte text-tenue-notte">
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-16 sm:px-6 md:grid-cols-[1.2fr_2fr]">
        <div>
          <Logotipo altezza={24} suScuro />
          <p className="prosa mt-4 max-w-xs text-[0.9375rem]">CRM e gestione per le piccole imprese italiane, un server per ogni azienda.</p>
        </div>
        <nav aria-label="Piede" className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {COLONNE.map(([titolo, voci]) => [titolo, titolo === "Fiducia" && blogNelMenu() ? [...voci, ["Blog", "/blog"] as const] : voci] as const).map(([titolo, voci]) => (
            <div key={titolo}>
              <h2 className="text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-carta">{titolo}</h2>
              <ul className="mt-4 space-y-3 text-[0.9375rem]">
                {voci.map(([etichetta, href]) => (
                  <li key={href}>
                    <a href={href} className="hover:text-carta">
                      {etichetta}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className="border-t border-filo-notte">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-8 gap-y-4 px-4 py-6 sm:px-6">
        <p className="text-[0.8125rem] leading-relaxed">
          © {anno} PMIFlow
          {legali.map(([etichetta, valore]) => (
            <span key={etichetta}>
              {" · "}
              {etichetta === "Titolare" || etichetta === "Sede" ? (
                valore
              ) : etichetta === "Tel." ? (
                <a href={hrefTelefono(valore)} className="whitespace-nowrap hover:text-carta">
                  Tel. {valore}
                </a>
              ) : (
                <span className="whitespace-nowrap">
                  {etichetta} {valore}
                </span>
              )}
            </span>
          ))}
          {" · "}
          <a href={`mailto:${IMPRESA.email}`} className="hover:text-carta">
            {IMPRESA.email}
          </a>
        </p>
        <FirmaAxialoop />
        </div>
      </div>
    </footer>
  );
}
