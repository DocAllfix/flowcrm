import { Intestazione } from "./Intestazione";
import { Piede } from "./Chiusura";
import { URL_CANONICO, jsonLd } from "@/lib/sito";

/**
 * Impaginato per le pagine di solo testo (sicurezza e legali): una colonna a
 * misura di lettura, titoli in Archivo espanso, briciole anche nei dati strutturati.
 */
export function PaginaTesto({
  occhiello,
  titolo,
  percorso,
  aggiornata,
  children,
}: {
  occhiello: string;
  titolo: string;
  percorso: string;
  aggiornata?: string;
  children: React.ReactNode;
}) {
  const briciole = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "PMIFlow", item: `${URL_CANONICO}/` },
      { "@type": "ListItem", position: 2, name: titolo, item: `${URL_CANONICO}${percorso}` },
    ],
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(briciole) }} />
      <Intestazione />
      <main id="contenuto" className="mx-auto w-full max-w-3xl px-4 pb-24 pt-16 sm:px-6 md:pt-24">
        <p className="occhiello">{occhiello}</p>
        <h1 className="titolo-sezione mt-6">{titolo}</h1>
        {aggiornata && (
          <p className="mt-4 text-[0.875rem] text-tenue">
            Aggiornata il{" "}
            <time dateTime={aggiornata}>
              {new Date(aggiornata).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}
            </time>
          </p>
        )}
        <div className="testo-lungo mt-12">{children}</div>
      </main>
      <Piede />
    </>
  );
}
