import { CONTATTI_ATTIVI, DEMO_ATTIVA, URL_DEMO, IMPRESA, LEGALI_AGGIORNATI_AL } from "@/lib/sito";
import { Freccia } from "./Freccia";
import { Logotipo } from "./Intestazione";

/**
 * L'unico blocco pieno di colore della pagina, come nei manifesti Olivetti: il cotto
 * copre la fascia intera una volta sola, ed è per questo che si nota. Testo in carta:
 * contrasto 5.2:1 (AA).
 */
export function ChiamataFinale() {
  if (!CONTATTI_ATTIVI && !DEMO_ATTIVA) return null;
  return (
    <section aria-labelledby="titolo-finale" className="bg-cotto text-carta">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-8 px-4 py-20 sm:px-6 md:flex-row md:items-end md:justify-between md:py-24">
        <h2 id="titolo-finale" className="titolo-sezione max-w-2xl">
          Mezz&apos;ora per capire se fa per voi.
        </h2>
        <div className="flex flex-wrap gap-4">
          {CONTATTI_ATTIVI && (
            <a href="#contatti" className="bottone bg-carta text-inchiostro hover:bg-foglio">
              Richiedi una presentazione <Freccia />
            </a>
          )}
          {DEMO_ATTIVA && (
            <a href={URL_DEMO} className="bottone text-carta shadow-[inset_0_0_0_1px_currentColor] hover:bg-cotto-scuro">
              Prova la demo
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

const COLONNE = [
  ["Prodotto", [["Funzioni", "/#funzioni"], ["Moduli di settore", "/#moduli"], ["Come si parte", "/#come-si-parte"], ["Domande", "/#domande"]]],
  ["Fiducia", [["Sicurezza e dati", "/sicurezza"]]],
  ["Legale", [["Privacy", "/privacy"], ["Cookie", "/cookie"], ["Termini", "/termini"]]],
] as const;

/**
 * Il piede. Ragione sociale, partita IVA e sede sono obbligatorie su un sito
 * commerciale italiano: si stampano quando esistono, e finché mancano
 * `verifica-seo.mjs` lo segnala invece di lasciar passare un piede vuoto.
 */
export function Piede() {
  const anno = LEGALI_AGGIORNATI_AL.slice(0, 4);
  const legali = [IMPRESA.ragioneSociale, IMPRESA.sede, IMPRESA.partitaIva && `P. IVA ${IMPRESA.partitaIva}`].filter(Boolean);
  return (
    <footer className="sezione-notte bg-notte text-tenue-notte">
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-16 sm:px-6 md:grid-cols-[1.2fr_2fr]">
        <div>
          <Logotipo altezza={24} suScuro />
          <p className="prosa mt-4 max-w-xs text-[0.9375rem]">CRM e gestione per le piccole imprese italiane, un server per ogni azienda.</p>
        </div>
        <nav aria-label="Piede" className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {COLONNE.map(([titolo, voci]) => (
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
        <p className="mx-auto w-full max-w-6xl px-4 py-6 text-[0.8125rem] sm:px-6">
          © {anno} {legali.length ? legali.join(" · ") : "PMIFlow"}
          {IMPRESA.email && (
            <>
              {" · "}
              <a href={`mailto:${IMPRESA.email}`} className="hover:text-carta">
                {IMPRESA.email}
              </a>
            </>
          )}
        </p>
      </div>
    </footer>
  );
}
