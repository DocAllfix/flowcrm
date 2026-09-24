/**
 * La finestra del prodotto nell'hero: il programma dentro un browser, con il menu
 * laterale che si può davvero usare (Cruscotto · Trattative · Cantieri).
 *
 * Preso dal riferimento `FormazioneEvalis` (evalisacademy.it): lì la dashboard sta in
 * una cornice di browser e il menu è esplorabile, ed è ciò che il committente indica
 * come «la schermata del sistema». Qui in più l'indirizzo dice il nostro
 * differenziante: `rossi-impianti.pmiflow.it`, il nome e il logo sono del cliente.
 *
 * ZERO JavaScript: le viste sono tre radio e `:has()` in globals.css (`.finestra`).
 * Le etichette esistono due volte, nel menu laterale (da tablet in su) e in una barra
 * di pulsanti sopra la finestra (telefono), dove il menu in scala sarebbe troppo
 * piccolo da toccare. Entrambe puntano agli stessi radio con `htmlFor`.
 * Senza `:has()` resta visibile il cruscotto, che è la vista preselezionata.
 *
 * Tutto in `em` dentro un `@container`: la finestra si rimpicciolisce senza tagliarsi
 * (tecnica di `evalisdeck/.../hero-deck.tsx`). Dati inventati e coerenti fra loro,
 * nessuna cifra in euro.
 */

const VISTE = [
  ["cruscotto", "Cruscotto"],
  ["trattative", "Trattative"],
  ["cantieri", "Cantieri"],
] as const;

const FERME = ["Contatti", "Fatture", "Scadenze"];

const COLONNE = [
  { fase: "Contatto", voci: ["Studio Ferri", "Tecnoservice"] },
  { fase: "Offerta", voci: ["Edil Garda", "Autotrasporti Bassi"] },
  { fase: "Trattativa", voci: ["Scuola Verdi"] },
  { fase: "Vinta", voci: ["Poliambulatorio San Luca"] },
] as const;

const SETTIMANA = [
  ["Lun", "F24 IVA mensile", "Fisco"],
  ["Mer", "DURC Edil Garda", "Cantiere"],
  ["Gio", "Revisione furgone FG 482", "Automezzi"],
  ["Ven", "Fattura 118, sollecito", "Incassi"],
] as const;

function Cruscotto() {
  return (
    <div>
      <p className="text-[1.5em] font-bold tracking-[-0.02em] [font-stretch:108%]">Buongiorno, Laura</p>
      <p className="mt-[0.2em] text-[1em] text-tenue">Ecco cosa c&apos;è da fare questa settimana.</p>
      <div className="mt-[1.4em] grid grid-cols-3 gap-[0.8em]">
        {[
          ["Trattative aperte", "6", false],
          ["Commesse attive", "7", false],
          ["Da sollecitare", "3", true],
        ].map(([etichetta, n, accento]) => (
          <div key={etichetta as string} className="rounded-[0.7em] border border-filo bg-foglio p-[1em]">
            <p className="text-[0.95em] text-tenue">{etichetta}</p>
            <p className={`cifre mt-[0.2em] text-[2.2em] font-bold leading-none [font-stretch:110%] ${accento ? "text-cotto" : ""}`}>
              {n}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-[1.2em] rounded-[0.7em] border border-filo bg-foglio px-[1.2em] py-[0.6em]">
        {SETTIMANA.map(([g, cosa, area], i) => (
          <div key={cosa} className={`flex items-baseline gap-[1em] py-[0.6em] text-[1em] ${i ? "border-t border-filo" : ""}`}>
            <span className="w-[2.4em] shrink-0 font-semibold text-cotto">{g}</span>
            <span className="flex-1 font-medium">{cosa}</span>
            <span className="text-[0.9em] text-tenue">{area}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Trattative() {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="text-[1.5em] font-bold tracking-[-0.02em] [font-stretch:108%]">Vendite 2026</p>
        <p className="text-[1em] text-tenue">6 trattative aperte</p>
      </div>
      <div className="mt-[1.4em] grid grid-cols-4 gap-[0.7em]">
        {COLONNE.map((c) => (
          <div key={c.fase} className="rounded-[0.7em] bg-carta-2 p-[0.7em]">
            <p className="text-[0.8em] font-semibold uppercase tracking-[0.12em] text-tenue">
              {c.fase} <span className="cifre">{c.voci.length}</span>
            </p>
            <div className="mt-[0.7em] space-y-[0.5em]">
              {c.voci.map((v) => (
                <div
                  key={v}
                  className={`rounded-[0.5em] border bg-foglio px-[0.6em] py-[0.8em] text-[0.95em] font-medium leading-tight ${
                    c.fase === "Vinta" ? "border-cotto" : "border-filo"
                  }`}
                >
                  {v}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-[1.2em] text-[0.95em] text-tenue">Trascina una trattativa: il valore pesato di ogni fase si ricalcola da solo.</p>
    </div>
  );
}

function Cantieri() {
  return (
    <div>
      <p className="text-[0.8em] font-semibold uppercase tracking-[0.16em] text-cotto">Cantiere · attivo</p>
      <p className="mt-[0.4em] text-[1.5em] font-bold tracking-[-0.02em] [font-stretch:108%]">Impianto elettrico, Scuola Verdi</p>
      <p className="mt-[0.2em] text-[1em] text-tenue">Via Cremona 14, Brescia · CIG B2F4E81A07</p>
      <div className="mt-[1.4em] grid grid-cols-5 gap-[0.4em]">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={`h-[0.6em] rounded-[0.2em] ${i < 2 ? "bg-cotto" : i === 2 ? "bg-cotto/40" : "bg-filo"}`}
          />
        ))}
      </div>
      <p className="mt-[0.7em] text-[1em]">
        <span className="font-semibold">SAL 3 di 5</span> <span className="text-tenue">in verifica dalla direzione lavori</span>
      </p>
      <div className="mt-[1.2em] rounded-[0.7em] border border-filo bg-foglio px-[1.2em] py-[0.4em]">
        {[
          ["DURC impresa", "valido, scade fra 41 giorni"],
          ["Subappaltatori", "2, documenti in ordine"],
          ["Documenti", "14 allegati"],
        ].map(([k, v], i) => (
          <div key={k} className={`flex justify-between gap-[1em] py-[0.7em] text-[1em] ${i ? "border-t border-filo" : ""}`}>
            <span className="text-tenue">{k}</span>
            <span className="font-medium">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FinestraProdotto() {
  return (
    <div className="finestra">
      {VISTE.map(([id], i) => (
        <input key={id} type="radio" name="vista-prodotto" id={`vista-${id}`} defaultChecked={i === 0} className="sr-only" />
      ))}

      {/* Telefono: pulsanti a misura di dito sopra la finestra. */}
      <div role="group" aria-label="Scegli la vista del programma" className="mb-4 flex gap-2 md:hidden">
        {VISTE.map(([id, nome]) => (
          <label key={id} htmlFor={`vista-${id}`} className="linguetta-vista cursor-pointer rounded-sm border border-filo px-3 py-2 text-[0.875rem] font-semibold text-tenue">
            {nome}
          </label>
        ))}
      </div>

      <div className="[container-type:inline-size]">
        <div
          aria-label="Anteprima di PMIFlow nell'istanza di un cliente, Rossi Impianti"
          className="overflow-hidden rounded-[1.1em] border border-filo bg-carta text-[clamp(6.5px,1.95cqw,11px)] shadow-[0_2.4em_4.8em_-2.4em_oklch(0.22_0.025_255/0.35),0_0.2em_0.6em_-0.2em_oklch(0.22_0.025_255/0.12)]"
        >
          {/* barra del browser */}
          <div aria-hidden="true" className="flex items-center gap-[0.5em] border-b border-filo bg-foglio px-[1.2em] py-[0.9em]">
            <span className="size-[0.8em] rounded-full bg-filo" />
            <span className="size-[0.8em] rounded-full bg-filo" />
            <span className="size-[0.8em] rounded-full bg-filo" />
            <span className="mx-auto rounded-[0.5em] bg-carta-2 px-[1.2em] py-[0.35em] font-mono text-[0.95em] text-tenue">
              rossi-impianti.pmiflow.it
            </span>
          </div>

          <div className="grid h-[30.5em] grid-cols-[12.5em_1fr]">
            {/* menu laterale con il marchio del CLIENTE, non il nostro */}
            <nav aria-label="Menu dell'anteprima" className="border-r border-filo bg-foglio px-[0.9em] py-[1.2em]">
              <div aria-hidden="true" className="mb-[1.4em] flex items-center gap-[0.6em] px-[0.4em]">
                <span className="flex size-[2.2em] items-center justify-center rounded-[0.5em] bg-[oklch(0.45_0.09_250)] text-[0.9em] font-bold text-carta">
                  RI
                </span>
                <span className="text-[1.05em] font-semibold leading-tight">Rossi Impianti</span>
              </div>
              <ul className="space-y-[0.2em]">
                {VISTE.map(([id, nome]) => (
                  <li key={id}>
                    <label
                      htmlFor={`vista-${id}`}
                      className="voce-vista hidden cursor-pointer rounded-[0.5em] px-[0.8em] py-[0.6em] text-[1.05em] font-medium text-tenue md:block"
                    >
                      {nome}
                    </label>
                    <span aria-hidden="true" data-voce={id} className="voce-vista-finta block rounded-[0.5em] px-[0.8em] py-[0.6em] text-[1.05em] font-medium text-tenue md:hidden">
                      {nome}
                    </span>
                  </li>
                ))}
                {FERME.map((nome) => (
                  <li key={nome} aria-hidden="true" className="px-[0.8em] py-[0.6em] text-[1.05em] text-tenue/60">
                    {nome}
                  </li>
                ))}
              </ul>
            </nav>

            <div className="relative overflow-hidden p-[1.8em]">
              <div className="pannello-vista" data-vista="cruscotto">
                <Cruscotto />
              </div>
              <div className="pannello-vista" data-vista="trattative">
                <Trattative />
              </div>
              <div className="pannello-vista" data-vista="cantieri">
                <Cantieri />
              </div>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-4 text-center text-[0.875rem] text-tenue">
        <span className="hidden md:inline">Usa il menu per esplorare.</span>{" "}
        Nome, logo e indirizzo sono del cliente, non nostri.
      </p>
    </div>
  );
}
