import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // 'hidden': le source map si GENERANO ma il bundle non le referenzia,
    // quindi nessun browser va a cercarle. Servono a una cosa sola: essere
    // caricate sul collettore degli errori, perché altrimenti ogni stack
    // trace che arriva è minificato e il codice evento mostrato all'utente
    // punta a righe illeggibili — cioè l'ErrorBoundary raccoglie segnalazioni
    // che non si possono usare.
    //
    // Restano comunque FUORI dall'immagine: il Dockerfile le cancella dopo la
    // build (`rm -f dist/**/*.map`). Con 'hidden' il rischio non è che il
    // browser le chieda, è che finiscano servite da Caddy e chiunque scarichi
    // il sorgente conoscendo il nome del file.
    sourcemap: 'hidden',
  },
})
