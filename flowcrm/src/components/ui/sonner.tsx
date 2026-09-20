/**
 * Toaster — involucro di Sonner.
 *
 * ⚠️ Questo componente LEGGE il tema, non lo applica. Fino al 2026-09-19
 * era l'unico consumatore di `useTheme()`, e siccome quell'hook scriveva
 * `.dark` su <html> dentro un effetto, era il Toaster a decidere il tema
 * dell'intera applicazione — su una macchina col sistema in scuro la
 * rendeva scura, senza che esistesse un interruttore per tornare indietro.
 * Ora il tema si applica all'avvio in main.tsx e lo stato è condiviso.
 */
import { Toaster as Sonner } from 'sonner'
import { useTheme } from '@/hooks/useTheme'

export function Toaster() {
  const { isDark } = useTheme()

  return (
    <Sonner
      theme={isDark ? 'dark' : 'light'}
      className="toaster group"
      position="top-right"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
        },
      }}
    />
  )
}
