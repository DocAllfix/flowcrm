import { MODULI, NUCLEO } from "@/contenuti/moduli";
import { PAGINE_SETTORE, type IdSettore } from "@/contenuti/settori";
import { CONTATTI_ATTIVI, DEMO_ATTIVA, URL_DEMO } from "@/lib/sito";
import { BloccoContatti } from "../BloccoContatti";
import { ChiamataFinale, Piede } from "../Chiusura";
import { Domande } from "../Domande";
import { Intestazione } from "../Intestazione";
import { Rivela } from "../Rivela";
import { GrigliaTessere } from "../Tessere";
import { ANTEPRIME_SETTORE } from "./anteprime";
import { FinestraSettore } from "./Finestra";

/**
 * La pagina di un modulo di settore (`/moduli/[slug]`). Stessa grammatica della home:
 * eroe con la finestra del prodotto, tessere illustrate, sezione notte, domande,
 * chiamata finale. Cambiano le parole: quelle del settore, per le ricerche di chi ci
 * lavora («gestionale cantiere», «software gare d'appalto»…).
 *
 * Testi in `contenuti/settori.ts`, anteprime in `settori/anteprime.tsx`.
 */
export function PaginaSettore({ id }: { id: IdSettore }) {
  const m = MODULI.find((x) => x.id === id)!;
  const p = PAGINE_SETTORE[id];
  const a = ANTEPRIME_SETTORE[id];
  const altri = MODULI.filter((x) => x.id !== id);
  const linkDemo = `${URL_DEMO}?vai=${encodeURIComponent(p.percorsoDemo)}`;

  return (
    <>
      <Intestazione contatti={CONTATTI_ATTIVI ? "#contatti" : "/#contatti"} />
      <main id="contenuto">
        {/* Eroe */}
        <section aria-labelledby="titolo-settore" className="relative isolate overflow-hidden border-b border-filo">
          <div aria-hidden="true" className="trama-punti absolute inset-0 -z-10" />
          <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8 sm:px-6 md:pb-24 md:pt-10">
            <nav aria-label="Percorso" className="text-[0.8125rem] text-tenue">
              <ol className="flex flex-wrap items-center gap-x-2">
                <li>
                  <a href="/" className="hover:text-inchiostro">Home</a>
                </li>
                <li aria-hidden="true">›</li>
                <li>
                  <a href="/moduli" className="hover:text-inchiostro">Moduli</a>
                </li>
                <li aria-hidden="true">›</li>
                <li aria-current="page" className="font-semibold text-inchiostro">{m.nome}</li>
              </ol>
            </nav>
            <div className="mt-10 grid items-center gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14">
              <div>
                <p className="occhiello">Modulo {m.nome}</p>
                <h1 id="titolo-settore" className="titolo-display mt-6 lg:text-[clamp(2.25rem,1rem+2.4vw,3.125rem)]">
                  {p.h1}
                </h1>
                <p className="prosa mt-6 max-w-[34rem] text-[1.0625rem] text-tenue md:text-[1.125rem]">{p.sottotitolo}</p>
                <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-5">
                  {DEMO_ATTIVA ? (
                    <a href={linkDemo} className="bottone bottone-due-righe bottone-inchiostro">
                      Apri {p.nomeBreve} nella demo{" "}
                      <span className="sotto">Un clic, senza registrazione</span>
                    </a>
                  ) : (
                    <a href="#aggiunge" className="bottone bottone-due-righe bottone-inchiostro">
                      Guarda cosa fa{" "}
                      <span className="sotto">Il modulo, scheda per scheda</span>
                    </a>
                  )}
                  {CONTATTI_ATTIVI && (
                    <a href="#contatti" className="collegamento-cta">
                      Richiedi una presentazione
                    </a>
                  )}
                </div>
                <p className="mt-8 text-[0.875rem] text-tenue">{m.perChi} Si aggiunge al nucleo di PMIFlow.</p>
              </div>
              <FinestraSettore d={a.finestra} />
            </div>
          </div>
        </section>

        {/* I problemi che risolve */}
        <section aria-labelledby="titolo-problemi" className="border-b border-filo">
          <div className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 md:py-28">
            <p className="occhiello">Il lavoro di tutti i giorni</p>
            <h2 id="titolo-problemi" className="titolo-sezione mt-6 max-w-2xl">
              Tre cose che oggi fanno perdere tempo, e come smettono di farlo.
            </h2>
            <ol className="mt-14 grid gap-x-10 gap-y-12 md:grid-cols-3">
              {p.problemi.map((x, i) => (
                <Rivela come="li" key={x.funzione} className="border-t border-filo pt-6">
                  <p className="cifre text-[0.8125rem] font-semibold text-cotto">
                    {String(i + 1).padStart(2, "0")} · {x.funzione}
                  </p>
                  <h3 className="mt-4 text-[1.1875rem] font-bold leading-snug tracking-[-0.01em] [font-stretch:104%]">{x.problema}</h3>
                  <p className="prosa mt-3 text-tenue">{x.soluzione}</p>
                </Rivela>
              ))}
            </ol>
          </div>
        </section>

        {/* Cosa aggiunge */}
        <section id="aggiunge" aria-labelledby="titolo-aggiunge" className="border-b border-filo">
          <div className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 md:py-32">
            <div className="max-w-2xl">
              <p className="occhiello">Cosa aggiunge</p>
              <h2 id="titolo-aggiunge" className="titolo-sezione mt-6">
                Le schede del modulo {m.nome}, come le vede chi lo usa.
              </h2>
            </div>
            <GrigliaTessere className="mt-16" voci={p.funzioni.map((f) => [a.tessere[f.anteprima]!, f] as const)} />
          </div>
        </section>

        {/* Come si aggancia al nucleo */}
        <section aria-labelledby="titolo-aggancio" className="sezione-notte bg-notte text-carta">
          <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-24 sm:px-6 md:py-28 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
            <div>
              <p className="occhiello">Non è un programma a parte</p>
              <h2 id="titolo-aggancio" className="titolo-sezione mt-6">Lavora sugli stessi dati del resto dell&apos;azienda.</h2>
              <p className="prosa mt-6 text-tenue-notte">{m.ponte}</p>
              <p className="mt-8">
                <a href="/moduli" className="font-semibold underline decoration-filo-notte underline-offset-4 hover:decoration-cotto-notte">
                  Il nucleo e tutti i moduli
                </a>
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              {NUCLEO.map((g) => {
                const usato = m.aggancia.includes(g.id);
                return (
                  <div
                    key={g.id}
                    className={`min-w-0 rounded-md border p-3.5 sm:p-5 ${
                      usato ? "border-cotto-notte bg-[oklch(0.7_0.14_42/0.1)]" : "border-filo-notte opacity-45"
                    }`}
                  >
                    <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-tenue-notte">
                      {usato ? "Usa" : "Nel nucleo"}
                    </p>
                    <h3 className="mt-2 text-[0.9375rem] font-bold [font-stretch:104%] sm:text-[1.0625rem]">{g.nome}</h3>
                    <ul className="mt-3 space-y-1.5 text-[0.8125rem] leading-snug text-pretty text-tenue-notte sm:text-[0.875rem]">
                      {g.voci.map((v) => (
                        <li key={v}>{v}</li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <Domande domande={p.domande} occhiello={`Domande sul modulo ${m.nome}`} titolo="Quello che ci chiedono su questo modulo." />

        {/* Gli altri moduli */}
        <section aria-labelledby="titolo-altri" className="border-b border-filo">
          <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
            <h2 id="titolo-altri" className="text-[1.25rem] font-bold [font-stretch:106%]">
              Gli altri moduli di settore
            </h2>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {altri.map((x) => (
                <li key={x.id}>
                  <a href={`/moduli/${x.id}`} className="group block h-full rounded-lg border border-filo bg-foglio p-5 hover:border-inchiostro">
                    <span className="block text-[1.0625rem] font-bold [font-stretch:106%]">{x.nome}</span>
                    <span className="mt-1 block text-[0.875rem] text-tenue">{x.perChi}</span>
                    <span className="mt-4 block text-[0.8125rem] font-semibold text-cotto">
                      Scopri il modulo <span aria-hidden="true">→</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {CONTATTI_ATTIVI && (
          <section aria-label="Richiedi una presentazione" className="sezione-notte bg-notte">
            <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
              <BloccoContatti modulo={m.nome} />
            </div>
          </section>
        )}

        {/* Con il modulo contatti qui sopra, la fascia finale sarebbe un doppione. */}
        {!CONTATTI_ATTIVI && <ChiamataFinale />}
      </main>
      <Piede />
    </>
  );
}
