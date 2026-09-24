import type { MetadataRoute } from "next";
import { URL_CANONICO } from "@/lib/sito";

/**
 * Crawler degli assistenti AMMESSI di proposito: per un prodotto nuovo farsi citare da
 * ChatGPT, Claude e Perplexity è il modo di farsi trovare da chi chiede «un CRM per
 * una piccola impresa edile».
 */
const FUORI = ["/api/", "/grazie"];

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
    host: URL_CANONICO,
  };
}
