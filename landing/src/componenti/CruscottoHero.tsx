/**
 * La dashboard del prodotto ricostruita in HTML, al posto di una fotografia.
 *
 * Perché non un'immagine: il testo pesa meno di un PNG, resta nitido a ogni densità
 * di schermo e non diventa l'elemento LCP (che deve restare l'h1, già nell'HTML).
 *
 * Tecnica presa da `evalisdeck/src/components/landing/hero-deck.tsx`: il contenitore
 * è un `@container` e la radice prende un corpo proporzionale alla larghezza
 * (11,5 px a 535 px di larghezza, meno sotto). Ogni misura interna è in `em`, quindi
 * l'intera composizione si rimpicciolisce senza tagliarsi, a 320 px come a 1440.
 *
 * Nessuna cifra in euro: sulla landing non compaiono importi, nemmeno finti.
 * I nomi sono inventati e coerenti fra le tre carte.
 */

const COLONNE = [
  { fase: "Contatto", voci: ["Rossi Impianti", "Studio Ferri"] },
  { fase: "Offerta", voci: ["Edil Garda", "Tecnoservice"] },
  { fase: "Trattativa", voci: ["Autotrasporti Bassi"] },
  { fase: "Vinta", voci: ["Poliambulatorio San Luca"] },
] as const;

const SCADENZE = [
  ["Lun", "F24 IVA mensile", "Fisco"],
  ["Mer", "DURC Edil Garda", "Cantiere"],
  ["Gio", "Revisione furgone FG 482", "Automezzi"],
  ["Ven", "Cauzione gara, svincolo", "Gare"],
] as const;

export function CruscottoHero() {
  return (
    <div className="[container-type:inline-size]">
      <div
        role="img"
        aria-label="Anteprima di PMIFlow: la pipeline delle trattative per fase, le scadenze della settimana e tre indicatori del mese."
        className="relative h-[36em] text-[clamp(6.5px,2.15cqw,11.5px)]"
      >
        <div aria-hidden="true">
          {/* ── Carta 1: pipeline (dietro, grande) ─────────────────── */}
          <div className="absolute left-0 top-0 w-[46em] rounded-[1.2em] border border-filo bg-foglio/85 p-[1.6em] shadow-[0_0.2em_0_0_var(--color-filo)]">
            <div className="flex items-baseline justify-between">
              <p className="text-[1.2em] font-semibold">Vendite 2026</p>
              <p className="text-[1em] text-tenue">6 trattative aperte</p>
            </div>
            <div className="mt-[1.4em] grid grid-cols-4 gap-[0.8em]">
              {COLONNE.map((c) => (
                <div key={c.fase} className="rounded-[0.7em] bg-carta-2 p-[0.7em]">
                  <p className="text-[0.85em] font-semibold uppercase tracking-[0.12em] text-tenue">
                    {c.fase} <span className="cifre">{c.voci.length}</span>
                  </p>
                  <div className="mt-[0.7em] space-y-[0.5em]">
                    {c.voci.map((v) => (
                      <div
                        key={v}
                        className={`rounded-[0.5em] border bg-foglio px-[0.6em] py-[0.7em] text-[0.95em] leading-tight ${
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
          </div>

          {/* ── Carta 2: scadenze (davanti, in basso a sinistra) ──── */}
          <div className="absolute left-[1.5em] top-[16.5em] w-[29em] rounded-[1.2em] bg-inchiostro p-[1.6em] text-carta shadow-[0_1.6em_3em_-1.6em_oklch(0.22_0.025_255/0.45)]">
            <p className="text-[1.2em] font-semibold">Questa settimana</p>
            <ul className="mt-[1em] divide-y divide-filo-notte">
              {SCADENZE.map(([g, cosa, area]) => (
                <li key={cosa} className="flex items-baseline gap-[1em] py-[0.7em] text-[1em]">
                  <span className="w-[2.6em] shrink-0 font-semibold text-cotto-notte">{g}</span>
                  <span className="flex-1">{cosa}</span>
                  <span className="text-[0.85em] text-tenue-notte">{area}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Carta 3: indicatori (davanti, a destra) ───────────── */}
          <div className="absolute right-0 top-[12em] w-[15.5em] rounded-[1.2em] border border-filo bg-foglio p-[1.6em] shadow-[0_1.6em_3em_-1.8em_oklch(0.22_0.025_255/0.3)]">
            {[
              ["Commesse attive", "7"],
              ["Da sollecitare", "3"],
              ["Visite degli agenti", "12"],
            ].map(([etichetta, n], i) => (
              <div key={etichetta} className={i ? "mt-[1.1em] border-t border-filo pt-[1.1em]" : ""}>
                <p className="text-[0.95em] text-tenue">{etichetta}</p>
                <p className={`cifre mt-[0.1em] text-[2.4em] font-bold leading-none [font-stretch:110%] ${i === 1 ? "text-cotto" : ""}`}>{n}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
