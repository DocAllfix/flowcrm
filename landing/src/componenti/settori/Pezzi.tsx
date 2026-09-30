import { Anteprima } from "../Tessere";

/**
 * Pezzi comuni delle anteprime di settore: stessa grammatica delle tessere della home
 * (`Funzioni`), così le pagine di settore sembrano lo stesso prodotto.
 * ⚠️ Nessun importo in euro, nemmeno finto (vedi `verifica-seo.mjs`).
 */

export type Tono = "accento" | "fatto" | "neutro" | "attesa";

const TONI: Record<Tono, string> = {
  accento: "bg-cotto/10 text-cotto-scuro",
  fatto: "bg-[oklch(0.55_0.1_155/0.12)] text-[oklch(0.4_0.09_155)]",
  neutro: "bg-carta-2 text-tenue",
  attesa: "border border-filo text-tenue",
};

export function Chip({ children, tono = "neutro" }: { children: React.ReactNode; tono?: Tono }) {
  return <span className={`shrink-0 whitespace-nowrap rounded-sm px-2 py-0.5 text-[0.6875rem] font-semibold ${TONI[tono]}`}>{children}</span>;
}

export function Etichetta({ children }: { children: React.ReactNode }) {
  return <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-tenue">{children}</p>;
}

/** Elenco a righe con titolo, nota e stato a destra. */
export function Righe({ righe }: { righe: { titolo: string; nota?: string; stato?: string; tono?: Tono }[] }) {
  return (
    <ul className="divide-y divide-filo">
      {righe.map((r) => (
        <li key={r.titolo + (r.nota ?? "")} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[0.8125rem] font-semibold leading-tight">{r.titolo}</span>
            {r.nota && <span className="block truncate text-[0.75rem] text-tenue">{r.nota}</span>}
          </span>
          {r.stato && <Chip tono={r.tono}>{r.stato}</Chip>}
        </li>
      ))}
    </ul>
  );
}

export function Barra({ percento, accento = false }: { percento: number; accento?: boolean }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-filo">
      <div className={`h-full rounded-full ${accento ? "bg-cotto" : "bg-inchiostro"}`} style={{ width: `${percento}%` }} />
    </div>
  );
}

/** Una riga con etichetta e barra: per avanzamenti, esiti, obiettivi. */
export function RigaBarra({ etichetta, valore, percento, accento }: { etichetta: string; valore: string; percento: number; accento?: boolean }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-[0.75rem]">
        <span className="truncate font-semibold">{etichetta}</span>
        <span className="cifre shrink-0 text-tenue">{valore}</span>
      </div>
      <div className="mt-1.5">
        <Barra percento={percento} accento={accento} />
      </div>
    </div>
  );
}

export function Intestazione({ codice, titolo, stato, tono = "accento" }: { codice?: string; titolo: string; stato?: string; tono?: Tono }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        {codice && <p className="font-mono text-[0.6875rem] text-tenue">{codice}</p>}
        <p className="truncate text-[0.9375rem] font-semibold">{titolo}</p>
      </div>
      {stato && <Chip tono={tono}>{stato}</Chip>}
    </div>
  );
}

export { Anteprima };
