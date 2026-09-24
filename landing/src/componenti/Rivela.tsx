/**
 * Comparsa allo scroll, SENZA JavaScript.
 *
 * Prima era un'isola client con `IntersectionObserver` (porting di evalisdeck), una
 * per riga: una ventina di componenti da idratare, e Lighthouse mobile misurava 840 ms
 * di blocco del thread principale su una pagina statica. Ora è CSS puro: l'animazione
 * è legata allo scorrimento (`animation-timeline: view()`, vedi `.rivela` in
 * globals.css). Dove il browser non la supporta il contenuto è semplicemente
 * visibile: si perde un effetto, non un contenuto.
 *
 * Solo transform e opacity. Mai nell'hero: l'h1 è l'elemento LCP.
 */
export function Rivela({
  children,
  className = "",
  come: Tag = "div",
}: {
  children: React.ReactNode;
  ritardo?: number;
  className?: string;
  come?: "div" | "li" | "article";
}) {
  return <Tag className={`rivela ${className}`}>{children}</Tag>;
}
