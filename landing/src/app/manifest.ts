import type { MetadataRoute } from "next";

/** Icone per «aggiungi a schermata Home». Le rasterizzazioni sono di Social-Studio, dal glifo. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PMIFlow",
    short_name: "PMIFlow",
    description: "CRM e gestione per le piccole imprese italiane.",
    start_url: "/",
    display: "browser",
    background_color: "#f9fafc",
    theme_color: "#f9fafc",
    lang: "it",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
