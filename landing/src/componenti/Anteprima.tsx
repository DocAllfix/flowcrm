/**
 * «Com'è, davvero»: tre ARTEFATTI del prodotto ricostruiti in HTML, non fotografie.
 *
 * Principio preso dai due riferimenti sullo stesso PC (`evalisdeck/.../hero-deck.tsx`,
 * `FormazioneEvalis/.../BentoHero.jsx`): si mostra ciò che il prodotto produce e cosa
 * significa per chi lo usa. Le schermate vere della demo erano inutilizzabili (dati di
 * test delle e2e, tour aperto, vecchio nome nei colori HubSpot); qui i dati li scriviamo
 * noi, coerenti fra loro e con il marchio PMIFlow.
 *
 * Ogni voce corrisponde a una funzione che esiste nel codice (`flowcrm/src/modules`):
 * incassi e scadenze, SAL/DURC/subappaltatori/CIG del modulo Cantiere, visite,
 * portafoglio e provvigioni del modulo Agenti. Nessun importo in euro: sulla landing
 * non compaiono cifre, nemmeno finte.
 *
 * L'unica interazione (le schede dello scadenziario) è CSS puro: radio + `:has()`.
 * Zero JavaScript, frecce da tastiera native del gruppo di radio. Senza `:has()` resta
 * visibile la prima scheda.
 */
import { Rivela } from "./Rivela";

const SCHEDE = [
  {
    id: "sollecitare",
    etichetta: "Da sollecitare",
    righe: [
      ["Fattura 118", "Edil Garda S.r.l.", "scaduta da 12 giorni", true],
      ["Fattura 104", "Autotrasporti Bassi", "scaduta da 5 giorni", true],
      ["Fattura 97", "Studio Ferri", "scaduta ieri", true],
    ],
  },
  {
    id: "scadenza",
    etichetta: "In scadenza",
    righe: [
      ["Fattura 121", "Rossi Impianti", "scade venerdì", false],
      ["F24 IVA mensile", "Adempimento fiscale", "scade lunedì", false],
      ["Fattura 123", "Tecnoservice", "scade fra 9 giorni", false],
    ],
  },
  {
    id: "incassate",
    etichetta: "Incassate",
    righe: [
      ["Fattura 112", "Poliambulatorio San Luca", "incassata oggi", false],
      ["Fattura 109", "Gialli Marketing", "incassata martedì", false],
      ["Fattura 101", "Verdi Software", "incassata la settimana scorsa", false],
    ],
  },
] as const;

function Scadenziario() {
  return (
    <div className="schede rounded-lg border border-filo bg-foglio p-6 sm:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <p className="text-[1.0625rem] font-semibold">Incassi e scadenze</p>
        <p className="text-[0.875rem] text-tenue">aggiornato adesso</p>
      </div>
      <div role="radiogroup" aria-label="Filtra le scadenze" className="mt-6 flex flex-wrap gap-2">
        {SCHEDE.map((s, i) => (
          <label key={s.id} className="cursor-pointer">
            <input type="radio" name="scadenziario" id={`scheda-${s.id}`} defaultChecked={i === 0} className="peer sr-only" />
            <span className="inline-flex items-center gap-2 rounded-sm border border-filo px-3 py-2 text-[0.875rem] font-semibold text-tenue peer-checked:border-inchiostro peer-checked:bg-inchiostro peer-checked:text-carta peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-cotto">
              {s.etichetta}
              <span className="cifre font-normal opacity-80">{s.righe.length}</span>
            </span>
          </label>
        ))}
      </div>
      {SCHEDE.map((s) => (
        <ul key={s.id} data-pannello={s.id} className="pannello mt-4">
          {s.righe.map(([doc, chi, quando, urgente]) => (
            <li
              key={doc}
              className="grid grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-1 border-b border-filo py-4 last:border-b-0 sm:grid-cols-[8rem_1fr_auto]"
            >
              <span className="text-[0.9375rem] font-semibold">{doc}</span>
              <span className="order-3 col-span-2 text-[0.9375rem] text-tenue sm:order-none sm:col-span-1">{chi}</span>
              <span className={`text-right text-[0.875rem] ${urgente ? "font-semibold text-cotto-scuro" : "text-tenue"}`}>
                {quando}
              </span>
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
}

const SAL = [
  ["SAL 1", "approvato"],
  ["SAL 2", "approvato"],
  ["SAL 3", "in verifica"],
  ["SAL 4", "da emettere"],
  ["SAL 5", "da emettere"],
] as const;

function Cantiere() {
  return (
    <div className="grid gap-x-12 gap-y-6 rounded-lg bg-inchiostro p-6 text-carta sm:p-8 md:grid-cols-2 md:p-10">
      <div>
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-cotto-notte">Cantiere · attivo</p>
        <p className="mt-3 text-[1.25rem] font-bold leading-tight [font-stretch:108%]">Ristrutturazione sede Rossi</p>
        <p className="mt-1 text-[0.875rem] text-tenue-notte">Via Cremona 14, Brescia</p>
        <ol className="mt-6 grid grid-cols-5 gap-1.5" aria-label="Stato dei SAL">
          {SAL.map(([n, stato], i) => (
            <li key={n}>
              <span
                aria-hidden="true"
                className={`block h-2 rounded-[2px] ${i < 2 ? "bg-cotto-notte" : i === 2 ? "bg-cotto-notte/45" : "bg-filo-notte"}`}
              />
              <span className="sr-only">
                {n}: {stato}
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-[0.875rem] text-tenue-notte">
          <span className="font-semibold text-carta">SAL 3 di 5</span> in verifica dalla direzione lavori
        </p>
      </div>
      <ul className="self-center divide-y divide-filo-notte border-t border-filo-notte text-[0.875rem]">
        <li className="flex justify-between gap-4 py-3">
          <span className="text-tenue-notte">DURC impresa</span>
          <span>valido, scade fra 41 giorni</span>
        </li>
        <li className="flex justify-between gap-4 py-3">
          <span className="text-tenue-notte">Subappaltatori</span>
          <span>2, documenti in ordine</span>
        </li>
        <li className="flex justify-between gap-4 py-3">
          <span className="text-tenue-notte">CIG</span>
          <span className="cifre">B2F4E81A07</span>
        </li>
      </ul>
    </div>
  );
}

const VISITE = [
  ["9:30", "Rossi Impianti", "rinnovo offerta"],
  ["11:45", "Edil Garda", "primo incontro"],
  ["15:00", "Tecnoservice", "consegna campionario"],
] as const;

function Agente() {
  return (
    <div className="mx-auto w-full max-w-[20rem] rounded-[1.75rem] border border-filo bg-foglio p-2 shadow-[0_1.5rem_3rem_-1.75rem_oklch(0.22_0.025_255/0.35)]">
      <div className="rounded-[1.35rem] bg-carta-2 px-5 pb-6 pt-5">
        <p className="text-[0.8125rem] text-tenue">Buongiorno, Marco</p>
        <p className="mt-1 text-[1.125rem] font-bold [font-stretch:108%]">Oggi hai 3 visite</p>
        <ul className="mt-4 space-y-2">
          {VISITE.map(([ora, chi, cosa]) => (
            <li key={ora} className="grid grid-cols-[3rem_1fr] rounded-md bg-foglio px-3 py-3">
              <span className="cifre text-[0.875rem] font-semibold text-cotto">{ora}</span>
              <span>
                <span className="block text-[0.9375rem] font-semibold leading-tight">{chi}</span>
                <span className="block text-[0.8125rem] text-tenue">{cosa}</span>
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 grid grid-cols-2 gap-2 text-[0.8125rem]">
          <div className="rounded-md bg-foglio px-3 py-3">
            <span className="block text-tenue">Portafoglio</span>
            <span className="cifre block text-[1.125rem] font-bold">38 clienti</span>
          </div>
          <div className="rounded-md bg-foglio px-3 py-3">
            <span className="block text-tenue">Ordini del mese</span>
            <span className="cifre block text-[1.125rem] font-bold">7</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const DIDASCALIE = [
  ["Chi devo sollecitare.", "Il titolare apre e sa chi chiamare, senza incrociare estratti conto e fogli Excel."],
  ["La giornata dell'agente.", "Dal telefono, fra una visita e l'altra: i suoi clienti, i suoi ordini, le sue provvigioni."],
  ["A che punto è il cantiere.", "SAL, DURC e subappaltatori sulla stessa scheda: la scadenza si vede prima che fermi i lavori."],
] as const;

function Didascalia({ n }: { n: 0 | 1 | 2 }) {
  const [titolo, testo] = DIDASCALIE[n];
  return (
    <div className="mt-6 grid grid-cols-[2.5rem_1fr] gap-x-4">
      <span className="cifre pt-1 text-[0.8125rem] font-semibold text-cotto">{String(n + 1).padStart(2, "0")}</span>
      <div>
        <h3 className="titolo-voce">{titolo}</h3>
        <p className="prosa mt-1 text-tenue">{testo}</p>
      </div>
    </div>
  );
}

export function Anteprima() {
  return (
    <section aria-labelledby="titolo-anteprima" className="border-b border-filo bg-carta-2/60">
      <div className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 md:py-32">
        <div className="max-w-2xl">
          <p className="occhiello">Com&apos;è, davvero</p>
          <h2 id="titolo-anteprima" className="titolo-sezione mt-6">
            Le tre risposte che cerchi appena apri il programma.
          </h2>
        </div>
        <div className="mt-16 grid gap-x-8 gap-y-14 lg:grid-cols-[1.35fr_1fr]">
          <Rivela className="flex flex-col">
            <div className="flex-1 [&>*]:h-full">
              <Scadenziario />
            </div>
            <Didascalia n={0} />
          </Rivela>
          <Rivela className="flex flex-col">
            <div className="flex flex-1 items-center">
              <Agente />
            </div>
            <Didascalia n={1} />
          </Rivela>
          <Rivela className="lg:col-span-2">
            <Cantiere />
            <Didascalia n={2} />
          </Rivela>
        </div>
      </div>
    </section>
  );
}
