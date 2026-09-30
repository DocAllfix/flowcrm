import { Rivela } from "./Rivela";

/**
 * Le tessere illustrate: un'anteprima del programma sopra, il testo sotto. Nate in
 * `Funzioni` (home), usate anche dalle pagine di settore.
 *
 * `GrigliaTessere` mette le tessere su due colonne uguali e fa di ognuna una SUBGRID di
 * due righe (anteprima, testo): le anteprime affiancate hanno la stessa altezza e i
 * titoli partono alla stessa riga, qualunque sia il contenuto.
 *
 * ⚠️ `grid-cols-1` (cioè `minmax(0, 1fr)`) su griglia, Rivela e tessera: senza, su
 * telefono la colonna implicita è `auto` e le etichette che non vanno a capo la
 * allargano oltre lo schermo.
 */

/** Cornice comune delle anteprime (l'altezza la pareggia la subgrid). */
export function Anteprima({ children }: { children: React.ReactNode }) {
  return (
    <div aria-hidden="true" className="rounded-md border border-filo bg-carta p-4">
      {children}
    </div>
  );
}

export function Tessera({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-filo bg-foglio p-6 sm:p-8 ${className}`}>{children}</div>;
}

export type VoceTessera = { titolo: string; testo: string; dettaglio?: string };

export function Testo({ voce, n }: { voce: VoceTessera; n: number }) {
  return (
    <div className="grid grid-cols-[2.25rem_1fr] gap-x-3">
      <span className="cifre pt-1 text-[0.8125rem] font-semibold text-cotto">{String(n).padStart(2, "0")}</span>
      <div>
        <h3 className="titolo-voce">{voce.titolo}</h3>
        <p className="prosa mt-2 text-tenue">{voce.testo}</p>
        {voce.dettaglio && <p className="mt-4 text-[0.8125rem] font-semibold">{voce.dettaglio}</p>}
      </div>
    </div>
  );
}

export function GrigliaTessere({
  voci,
  className = "",
}: {
  voci: ReadonlyArray<readonly [React.ComponentType, VoceTessera]>;
  className?: string;
}) {
  return (
    <div className={`grid grid-cols-1 gap-6 md:grid-cols-2 ${className}`}>
      {voci.map(([Vista, voce], i) => (
        <Rivela key={voce.titolo} className="row-span-2 grid min-w-0 grid-cols-1 grid-rows-subgrid">
          <Tessera className="row-span-2 grid min-w-0 grid-cols-1 grid-rows-subgrid gap-y-8">
            <Vista />
            <Testo voce={voce} n={i + 1} />
          </Tessera>
        </Rivela>
      ))}
    </div>
  );
}
