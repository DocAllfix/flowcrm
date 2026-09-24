import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import { NOME, URL_CANONICO, IMPRESA, jsonLd } from "@/lib/sito";
import { PROMESSA } from "@/contenuti/promessa";
import "./globals.css";

/**
 * Archivo, una famiglia sola con l'asse della larghezza: espansa per i titoli,
 * normale per il testo. `next/font` la scarica al BUILD e la serve dal nostro
 * dominio: in produzione nessuna richiesta a Google, ed è ciò che permette
 * `font-src 'self'` nella CSP.
 */
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
  variable: "--font-archivo",
});

const TITOLO = `${NOME} · CRM e gestione per piccole imprese`;

export const metadata: Metadata = {
  metadataBase: new URL(URL_CANONICO),
  title: { default: TITOLO, template: `%s · ${NOME}` },
  description: PROMESSA.descrizione,
  applicationName: NOME,
  alternates: { canonical: "/" },
  robots: { index: true, follow: true, "max-image-preview": "large" },
  openGraph: {
    type: "website",
    locale: "it_IT",
    siteName: NOME,
    url: "/",
    title: TITOLO,
    description: PROMESSA.descrizione,
  },
  twitter: { card: "summary_large_image", title: TITOLO, description: PROMESSA.descrizione },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: "#fcfaf6",
  colorScheme: "light",
};

/**
 * `Organization` su tutte le pagine. I campi legali entrano solo quando esistono:
 * un `vatID` vuoto è un dato falso, non un dato mancante.
 */
const ORGANIZZAZIONE = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${URL_CANONICO}/#organizzazione`,
  name: IMPRESA.ragioneSociale || NOME,
  brand: { "@type": "Brand", name: NOME },
  url: URL_CANONICO,
  logo: `${URL_CANONICO}/icon-512.png`,
  ...(IMPRESA.email ? { email: IMPRESA.email } : {}),
  ...(IMPRESA.partitaIva ? { vatID: IMPRESA.partitaIva } : {}),
  ...(IMPRESA.sede ? { address: IMPRESA.sede } : {}),
};

export default function Radice({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={archivo.variable}>
      <body className="bg-carta text-inchiostro antialiased">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ORGANIZZAZIONE) }} />
        <a
          href="#contenuto"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-sm focus:bg-inchiostro focus:px-4 focus:py-2 focus:text-carta"
        >
          Vai al contenuto
        </a>
        {children}
      </body>
    </html>
  );
}
