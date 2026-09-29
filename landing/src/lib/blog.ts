import { readFileSync } from "node:fs";
import path from "node:path";
import { imageSize } from "image-size";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import { contaParole, eVisibile, oggiARoma, tuttiIFile, type FileArticolo, type SettoreBlog } from "./blog-schema";

/**
 * Il blog: articoli Markdown in `src/contenuti/blog/<slug>.md`, letti AL BUILD.
 *
 * Un articolo con data futura non esiste finché non arriva la sua data e il sito non
 * viene ricompilato: ci pensa ogni mattina `.github/workflows/pubblica-programmati.yml`.
 * Un articolo con l'intestazione sbagliata FA FALLIRE il build della landing, di
 * proposito: meglio un rilascio fermo che un articolo rotto online (la demo è un
 * progetto a parte, il blog non la può bloccare).
 */

export type VoceIndice = { id: string; testo: string };

export type Articolo = FileArticolo & {
  html: string;
  indice: VoceIndice[];
  parole: number;
  minuti: number;
  /** L'HTML diviso prima del terzo h2: lì la pagina inserisce il riquadro verso il modulo. */
  htmlPrima: string;
  htmlDopo: string;
};

const ANTEPRIMA = process.env.BLOG_ANTEPRIMA === "1";
const PUBBLICA = path.join(process.cwd(), "public");

type Nodo = { type: string; tagName?: string; properties?: Record<string, unknown>; children?: Nodo[]; value?: string; data?: Record<string, unknown> };

const testoDi = (n: Nodo): string => (n.type === "text" ? (n.value ?? "") : (n.children ?? []).map(testoDi).join(""));

/** `> [!nota]` e `> [!attenzione]` diventano riquadri (sintassi degli avvisi di GitHub). */
function riquadri() {
  return (albero: Nodo) => {
    visit(albero as never, "blockquote", (nodo: Nodo) => {
      const primo = nodo.children?.[0];
      const testo = primo?.children?.[0];
      const m = testo?.type === "text" ? testo.value?.match(/^\[!(nota|attenzione)\]\s*/i) : null;
      if (!m || !testo) return;
      testo.value = testo.value!.slice(m[0].length);
      const tipo = m[1]!.toLowerCase();
      nodo.data = { ...nodo.data, hName: "aside", hProperties: { className: ["riquadro", `riquadro-${tipo}`], "data-tipo": tipo === "nota" ? "Nota" : "Attenzione" } };
    });
  };
}

/**
 * Immagini: misure lette dal file (niente salti di impaginazione), caricamento pigro,
 * e un paragrafo che contiene solo un'immagine diventa `<figure>` con la didascalia
 * presa dal titolo Markdown: `![testo alternativo](/blog/x/y.png "didascalia")`.
 */
function immagini() {
  return (albero: Nodo) => {
    visit(albero as never, "element", (nodo: Nodo) => {
      if (nodo.tagName === "img") {
        const src = String(nodo.properties?.src ?? "");
        if (src.startsWith("/")) {
          try {
            const { width, height } = imageSize(readFileSync(path.join(PUBBLICA, src)));
            nodo.properties = { ...nodo.properties, width, height };
          } catch {
            // Il controllo editoriale segnala l'immagine mancante; qui non si ferma la pagina.
          }
        }
        nodo.properties = { ...nodo.properties, loading: "lazy", decoding: "async" };
      }
      if (nodo.tagName === "p" && nodo.children?.length === 1 && nodo.children[0]!.tagName === "img") {
        const img = nodo.children[0]!;
        const didascalia = String(img.properties?.title ?? "");
        delete img.properties!.title;
        nodo.tagName = "figure";
        nodo.children = didascalia ? [img, { type: "element", tagName: "figcaption", properties: {}, children: [{ type: "text", value: didascalia }] }] : [img];
      }
    });
  };
}

/** Collegamenti esterni: nuova scheda no, `rel` sì (niente referrer verso chi citiamo senza volerlo). */
function collegamenti() {
  return (albero: Nodo) => {
    visit(albero as never, "element", (nodo: Nodo) => {
      if (nodo.tagName !== "a") return;
      const href = String(nodo.properties?.href ?? "");
      if (/^https?:\/\//.test(href) && !href.startsWith("https://pmiflow.eu")) {
        nodo.properties = { ...nodo.properties, rel: ["noopener", "external"] };
      }
    });
  };
}

function rendi(corpo: string) {
  const indice: VoceIndice[] = [];
  const raccogliIndice = () => (albero: Nodo) => {
    visit(albero as never, "element", (nodo: Nodo) => {
      if (nodo.tagName === "h2" && nodo.properties?.id) indice.push({ id: String(nodo.properties.id), testo: testoDi(nodo) });
    });
  };
  const html = String(
    unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(riquadri)
      .use(remarkRehype)
      .use(rehypeSlug)
      .use(raccogliIndice)
      .use(immagini)
      .use(collegamenti)
      .use(rehypeStringify)
      .processSync(corpo),
  );
  return { html, indice };
}

/** Divide l'HTML prima del terzo h2: lì la pagina mette il riquadro verso il modulo. */
function dividi(html: string): [string, string] {
  let conta = 0;
  let punto = -1;
  html.replace(/<h2[\s>]/g, (t, i: number) => {
    conta++;
    if (conta === 3) punto = i;
    return t;
  });
  return punto < 0 ? [html, ""] : [html.slice(0, punto), html.slice(punto)];
}

let cache: Articolo[] | null = null;

/** Tutti gli articoli visibili, dal più recente. */
export function articoli(): Articolo[] {
  if (cache) return cache;
  const oggi = oggiARoma();
  cache = tuttiIFile()
    .filter((f) => eVisibile(f.intestazione, oggi, ANTEPRIMA))
    .map((f) => {
      const { html, indice } = rendi(f.corpo);
      const parole = contaParole(f.corpo);
      const [htmlPrima, htmlDopo] = dividi(html);
      return { ...f, html, indice, parole, minuti: Math.max(1, Math.round(parole / 200)), htmlPrima, htmlDopo };
    })
    .sort((a, b) => b.intestazione.data.localeCompare(a.intestazione.data) || a.slug.localeCompare(b.slug));
  return cache;
}

export function articolo(slug: string): Articolo | undefined {
  return articoli().find((a) => a.slug === slug);
}

export function articoliDelSettore(settore: SettoreBlog): Articolo[] {
  return articoli().filter((a) => a.intestazione.settore === settore);
}

/** Tre correlati: prima lo stesso settore, poi i più recenti. */
export function correlati(a: Articolo, quanti = 3): Articolo[] {
  const altri = articoli().filter((x) => x.slug !== a.slug);
  const stesso = altri.filter((x) => x.intestazione.settore === a.intestazione.settore);
  return [...stesso, ...altri.filter((x) => !stesso.includes(x))].slice(0, quanti);
}

/** Il blog compare nel menu solo con almeno tre articoli: un blog vuoto si legge come abbandonato. */
export const MINIMO_PER_IL_MENU = 3;
export function blogNelMenu(): boolean {
  return articoli().length >= MINIMO_PER_IL_MENU;
}

/** «29 settembre 2026» */
export function dataLeggibile(aaaammgg: string): string {
  return new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${aaaammgg}T00:00:00Z`));
}
