/**
 * VistaModulo — quale "prodotto" sta guardando l'utente: il CRM completo
 * ('tutti') oppure un singolo modulo verticale (slug). Guida SOLO la
 * navigazione visibile in Sidebar (le route restano tutte montate: la
 * barriera sui dati è la RLS, l'attivazione è VITE_MODULES).
 *
 * Serve alle demo dei rappresentanti: selezionando "Cantiere" la sidebar
 * mostra il modulo come fosse un prodotto standalone sopra la base CRM.
 */
import { createContext, useContext, useState, type ReactNode } from 'react'
import { moduloBySlug } from '@/config/moduli.config'

const STORAGE_KEY = 'flowcrm-vista-modulo'

interface VistaModuloValue {
  /** 'tutti' oppure lo slug di un modulo attivo. */
  vista: string
  setVista: (v: string) => void
}

const VistaModuloContext = createContext<VistaModuloValue | null>(null)

export function VistaModuloProvider({ children }: { children: ReactNode }) {
  const [vista, setVistaState] = useState<string>(() => {
    const salvata = localStorage.getItem(STORAGE_KEY)
    // Se il modulo salvato non è più attivo (config cambiata) → 'tutti'
    return salvata && (salvata === 'tutti' || moduloBySlug(salvata)) ? salvata : 'tutti'
  })

  function setVista(v: string) {
    setVistaState(v)
    localStorage.setItem(STORAGE_KEY, v)
  }

  return (
    <VistaModuloContext.Provider value={{ vista, setVista }}>
      {children}
    </VistaModuloContext.Provider>
  )
}

export function useVistaModulo(): VistaModuloValue {
  const ctx = useContext(VistaModuloContext)
  if (!ctx) throw new Error('useVistaModulo deve essere usato dentro <VistaModuloProvider>')
  return ctx
}
