import type { MetadataRoute } from "next";
import { URL_CANONICO } from "@/lib/sito";

/**
 * Crawler degli assistenti AMMESSI di proposito: per un prodotto nuovo farsi citare da
 * ChatGPT, Claude e Perplexity è il modo di farsi trovare da chi chiede «un CRM per
 * una piccola impresa edile».
 *
 * ⚠️ `/grazie` NON sta qui: è `noindex` nella pagina, e un indirizzo vietato in robots.txt
 * Google non lo legge, quindi il noindex non lo vede e lo segnala come «Indicizzata ma
 * bloccata da robots.txt». Una pagina o si vieta o si marca noindex, mai tutte e due.
 */
const FUORI = ["/api/"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: FUORI },
      {
        userAgent: ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-User", "PerplexityBot", "Google-Extended"],
        allow: "/",
        disallow: FUORI,
      },
    ],
    sitemap: `${URL_CANONICO}/sitemap.xml`,
  };
}
