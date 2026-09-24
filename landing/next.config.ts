import type { NextConfig } from "next";

/**
 * Intestazioni di sicurezza, le stesse che `flowcrm/deploy/security-headers-check.sh`
 * verifica sulle istanze.
 *
 * ⚠️ COMPROMESSO DICHIARATO su `script-src`: c'è `'unsafe-inline'`, lo stesso di
 * evalisdeck. Toglierlo richiede un nonce per richiesta, e il nonce rende dinamiche
 * tutte le pagine: si perderebbe l'HTML statico che tiene l'LCP sotto i due secondi.
 * Qui il rischio è basso: nessun login, nessun dato utente in pagina, nessuno script di
 * terzi. `connect-src 'self'`: il modulo parla solo con la nostra rotta.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const INTESTAZIONI = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const config: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  images: { formats: ["image/avif", "image/webp"] },
  async headers() {
    return [{ source: "/:path*", headers: INTESTAZIONI }];
  },
  /**
   * Un solo indirizzo indicizzato. `www.pmiflow.eu` e i due host `.it` rimandano con 308
   * a `https://pmiflow.eu`, conservando il percorso. I redirect di dominio si possono
   * dare anche dal pannello di Vercel: qui stanno nel codice, così si rivedono in un diff.
   */
  async redirects() {
    return ["www.pmiflow.eu", "pmiflow.it", "www.pmiflow.it"].map((host) => ({
      source: "/:path*",
      has: [{ type: "host" as const, value: host }],
      destination: "https://pmiflow.eu/:path*",
      permanent: true,
    }));
  },
};

export default config;
