import { FUNZIONI } from "@/contenuti/funzioni";
import { Anteprima, GrigliaTessere } from "./Tessere";

/**
 * Le sei funzioni come sei tessere che MOSTRANO invece di dire, come i passi del
 * riferimento FormazioneEvalis: ogni tessera ha un'anteprima del programma e sotto il
 * testo. Le prime due: il white-label (lo stesso programma per tre clienti, ognuno col
 * suo colore e il suo indirizzo) e la scheda cliente con la sua storia; le altre quattro
 * continuano quella storia (vedi sotto).
 *
 * Prima le ultime quattro erano solo testo sotto due tessere illustrate: la pagina
 * perdeva ritmo proprio dove elenca cosa fa il prodotto. I testi vengono da
 * `contenuti/funzioni.ts`, la stessa fonte del JSON-LD.
 */
const [ANAGRAFICHE, TRATTATIVE, COMMESSE, FATTURE, RUOLI, MARCHIO] = FUNZIONI;

const CLIENTI = [
  { sigla: "RI", nome: "Rossi Impianti", indirizzo: "rossi-impianti.pmiflow.it", tinta: "oklch(0.45 0.09 250)" },
  { sigla: "SF", nome: "Studio Ferri", indirizzo: "studio-ferri.pmiflow.it", tinta: "oklch(0.47 0.1 155)" },
  { sigla: "SL", nome: "Poliambulatorio San Luca", indirizzo: "sanluca.pmiflow.it", tinta: "oklch(0.44 0.11 330)" },
] as const;

const STORIA = [
  ["Oggi", "Chiamata con Marco Bassi", "vuole l'offerta entro venerdì"],
  ["Martedì", "Offerta 41 inviata", "impianto di climatizzazione"],
  ["12 set", "Riunione in sede", "sopralluogo con il tecnico"],
  ["3 set", "Fattura 97 incassata", "nei tempi"],
] as const;

/*
 * Le quattro tessere sotto continuano la STESSA storia della scheda di Autotrasporti
 * Bassi (offerta 41 in evidenza fra le trattative, fattura 97 incassata il 3 settembre) e
 * dello stesso studio: la trattativa, la commessa nata da una trattativa vinta, le
 * scadenze, chi può vedere cosa. Così le sei tessere si leggono come un giro di lavoro,
 * non come sei funzioni slegate.
 *
 * ⚠️ NIENTE IMPORTI IN EURO, nemmeno finti: il gate `verifica-seo.mjs` rifiuta il
 * simbolo ovunque nella pagina, e un «12.600 €» letto di corsa sembra un listino.
 * Le anteprime mostrano stati, date e prossimi passi.
 */
const COLONNE = [
  { fase: "Contatto", carte: [["Studio Ferri", "richiamare lunedì"], ["Bar Centrale", "primo incontro"]] },
  { fase: "Offerta", carte: [["Autotrasporti Bassi", "offerta 41"], ["Rossi Impianti", "offerta 39"]] },
  { fase: "Vinta", carte: [["Ottica Neri", "diventa commessa"]] },
] as const;

const SCADENZE = [
  { giorno: "3", mese: "ott", cosa: "Fattura 102 · Rossi Impianti", nota: "scaduta da 3 giorni · da sollecitare", stato: "urgente" },
  { giorno: "16", mese: "ott", cosa: "F24 IVA di settembre", nota: "promemoria fra 5 giorni", stato: "promemoria" },
  { giorno: "31", mese: "ott", cosa: "Fattura 104 · Studio Ferri", nota: "emessa oggi, a 30 giorni", stato: "promemoria" },
  { giorno: "3", mese: "set", cosa: "Fattura 97 · Autotrasporti Bassi", nota: "incassata nei tempi", stato: "fatto" },
] as const;

const PERSONE = [
  { sigla: "AL", chi: "Alessia", ruolo: "Titolare", vede: "Tutto" },
  { sigla: "LU", chi: "Luca", ruolo: "Agente", vede: "I suoi 14 clienti" },
  { sigla: "SA", chi: "Sara", ruolo: "Segreteria", vede: "Agenda e anagrafiche" },
] as const;

function AnteprimaTrattative() {
  return (
    <Anteprima>
      <div className="grid grid-cols-3 gap-2">
        {COLONNE.map((c) => (
          <div key={c.fase}>
            <p className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-tenue">{c.fase}</p>
            <div className="space-y-2">
              {c.carte.map(([nome, valore]) => {
                const inEvidenza = nome === "Autotrasporti Bassi";
                return (
                  <div
                    key={nome}
                    className={`rounded-sm border bg-foglio px-2.5 py-2 ${
                      inEvidenza ? "border-cotto" : "border-filo"
                    }`}
                  >
                    <p className="truncate text-[0.75rem] font-semibold leading-tight">{nome}</p>
                    <p className="mt-0.5 truncate text-[0.6875rem] text-tenue">{valore}</p>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-baseline justify-between border-t border-filo pt-3">
        <span className="text-[0.75rem] text-tenue">Trattative aperte · 2 da richiamare questa settimana</span>
        <span className="cifre text-[0.9375rem] font-semibold">4</span>
      </div>
    </Anteprima>
  );
}

function AnteprimaCommessa() {
  return (
    <Anteprima>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[0.6875rem] text-tenue">C-2026-031</p>
          <p className="truncate text-[0.9375rem] font-semibold">Rinnovo negozio Ottica Neri</p>
        </div>
        <span className="shrink-0 rounded-sm bg-cotto/10 px-2 py-0.5 text-[0.6875rem] font-semibold text-cotto-scuro">In corso</span>
      </div>
      <p className="mt-1 text-[0.75rem] text-tenue">Nata dalla trattativa vinta il 18 settembre</p>
      <div className="mt-4">
        <div className="flex items-baseline justify-between text-[0.75rem]">
          <span className="text-tenue">Avanzamento · budget rispettato</span>
          <span className="cifre font-semibold">62%</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-filo">
          <div className="h-full w-[62%] rounded-full bg-cotto" />
        </div>
      </div>
      <ul className="mt-4 space-y-1.5 border-t border-filo pt-3 text-[0.75rem]">
        {["Progetto esecutivo.pdf", "Verbale di sopralluogo.pdf"].map((f) => (
          <li key={f} className="flex items-center gap-2">
            <svg width="12" height="14" viewBox="0 0 12 14" className="shrink-0 text-tenue">
              <path d="M1.5 1h6l3 3v9h-9z M7.5 1v3h3" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
            </svg>
            <span className="truncate">{f}</span>
          </li>
        ))}
      </ul>
    </Anteprima>
  );
}

function AnteprimaScadenze() {
  return (
    <Anteprima>
      <ul className="divide-y divide-filo">
        {SCADENZE.map((s) => (
          <li key={s.cosa} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
            <span className="w-9 shrink-0 text-center leading-none">
              <span className="cifre block text-[1.0625rem] font-semibold">{s.giorno}</span>
              <span className="block text-[0.625rem] uppercase tracking-[0.1em] text-tenue">{s.mese}</span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.8125rem] font-semibold leading-tight">{s.cosa}</span>
              <span className="block truncate text-[0.75rem] text-tenue">{s.nota}</span>
            </span>
            <span
              className={`size-2 shrink-0 rounded-full ${
                s.stato === "urgente" ? "bg-cotto" : s.stato === "fatto" ? "bg-[oklch(0.55_0.1_155)]" : "border border-tenue"
              }`}
            />
          </li>
        ))}
      </ul>
    </Anteprima>
  );
}

function AnteprimaRuoli() {
  return (
    <Anteprima>
      <p className="text-[0.75rem] text-tenue">Chi apre la fattura 97</p>
      <ul className="mt-3 space-y-2">
        {PERSONE.map((r) => {
          const vede = r.ruolo !== "Segreteria";
          return (
            <li key={r.chi} className="flex items-center gap-3 rounded-sm border border-filo bg-foglio px-3 py-2">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-inchiostro text-[0.625rem] font-bold text-carta">
                {r.sigla}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[0.8125rem] font-semibold leading-tight">
                  {r.chi} <span className="font-normal text-tenue">· {r.ruolo}</span>
                </span>
                <span className="block truncate text-[0.6875rem] text-tenue">Vede: {r.vede}</span>
              </span>
              <span className={`shrink-0 text-[0.6875rem] font-semibold ${vede ? "text-inchiostro" : "text-cotto-scuro"}`}>
                {vede ? "La vede" : "Non la vede"}
              </span>
            </li>
          );
        })}
      </ul>
    </Anteprima>
  );
}

function AnteprimaMarchio() {
  return (
    <div aria-hidden="true" className="space-y-3">
      {CLIENTI.map((c, i) => (
        <div
          key={c.sigla}
          className="flex items-center gap-3 rounded-md border border-filo bg-carta px-4 py-3"
          style={{ marginLeft: `${i * 1.25}rem`, marginRight: `${(2 - i) * 1.25}rem` }}
        >
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-sm text-[0.75rem] font-bold text-carta"
            style={{ background: c.tinta }}
          >
            {c.sigla}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[0.9375rem] font-semibold">{c.nome}</span>
            <span className="block truncate font-mono text-[0.75rem] text-tenue">{c.indirizzo}</span>
          </span>
          <span className="hidden rounded-sm px-2.5 py-1 text-[0.75rem] font-semibold text-carta sm:block" style={{ background: c.tinta }}>
            Cruscotto
          </span>
        </div>
      ))}
    </div>
  );
}

function AnteprimaStoria() {
  return (
    <div aria-hidden="true" className="rounded-md border border-filo bg-carta p-4">
      <p className="text-[0.9375rem] font-semibold">Autotrasporti Bassi</p>
      <p className="text-[0.75rem] text-tenue">Cliente dal 2023 · referente Marco Bassi</p>
      <ol className="mt-4 space-y-3 border-l border-filo pl-4">
        {STORIA.map(([quando, cosa, nota], i) => (
          <li key={cosa} className="relative">
            <span className={`absolute left-[-1.3rem] top-1.5 size-2 rounded-full ${i === 0 ? "bg-cotto" : "bg-filo"}`} />
            <p className="text-[0.8125rem] font-semibold leading-tight">
              {cosa} <span className="font-normal text-tenue">· {quando}</span>
            </p>
            <p className="text-[0.75rem] text-tenue">{nota}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

const VOCI = [
  [AnteprimaMarchio, MARCHIO],
  [AnteprimaStoria, ANAGRAFICHE],
  [AnteprimaTrattative, TRATTATIVE],
  [AnteprimaCommessa, COMMESSE],
  [AnteprimaScadenze, FATTURE],
  [AnteprimaRuoli, RUOLI],
] as const;

export function Funzioni() {
  return (
    <section id="funzioni" aria-labelledby="titolo-funzioni" className="border-b border-filo">
      <div className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 md:py-32">
        <div className="max-w-2xl">
          <p className="occhiello">Ogni giorno</p>
          <h2 id="titolo-funzioni" className="titolo-sezione mt-6">
            Tutto quello che oggi sta in tre programmi, due fogli Excel e un quaderno.
          </h2>
        </div>

        <GrigliaTessere voci={VOCI} className="mt-16" />
      </div>
    </section>
  );
}
