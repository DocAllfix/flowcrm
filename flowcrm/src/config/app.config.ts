/**
 * Configurazione white-label per istanza cliente.
 * Ogni cliente ha il proprio .env — nessun brand hardcoded nel codice.
 */
export const APP_CONFIG = {
  // Identità
  appName:     import.meta.env.VITE_APP_NAME     ?? 'FlowCRM',
  clienteName: import.meta.env.VITE_CLIENTE_NAME ?? '',
  logoUrl:     import.meta.env.VITE_LOGO_URL     ?? '/logo-default.svg',
  faviconUrl:  import.meta.env.VITE_FAVICON_URL  ?? '/favicon.svg',

  // Tema colori (default: palette del prototipo)
  primaryColor: import.meta.env.VITE_PRIMARY_COLOR ?? '#ff5c35',
  accentColor:  import.meta.env.VITE_ACCENT_COLOR  ?? '#33475b',

  // Supabase (solo chiave anonima — mai service_role nel frontend)
  supabaseUrl:     import.meta.env.VITE_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,

  // Demo mode: mostra badge "DEMO" nell'header. Default false in prod.
  demoMode: import.meta.env.VITE_DEMO_MODE === 'true',

  // Moduli verticali attivi in questa istanza (CSV di slug, es. "gare,cantiere").
  // La UI mostra solo questi; la barriera vera è la licenza nel DB
  // (moduli_licenze + RLS modulo_licenziato). Vuoto = solo CRM base.
  moduli: (import.meta.env.VITE_MODULES ?? '')
    .split(',')
    .map((s: string) => s.trim())
    .filter(Boolean) as string[],

  // Tour interattivo (driver.js). Se assente, HelpButton/OnboardingBanner
  // ritornano null e il codice tour è escluso dal bundle.
  tourEnabled: import.meta.env.VITE_TOUR_ENABLED === 'true',

  // Sentry (opzionale per istanza)
  sentryDsn: import.meta.env.VITE_SENTRY_DSN ?? '',
}
