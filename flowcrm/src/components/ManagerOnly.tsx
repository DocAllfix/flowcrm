import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

/**
 * Guard per il modulo Amministrazione: solo admin/manager.
 * La RLS è comunque la barriera reale — questo evita solo che l'operatore
 * raggiunga la pagina via URL diretto (redirect alla home).
 */
export function ManagerOnly({ children }: { children: ReactNode }) {
  const { isManager, isLoading } = useAuth()
  if (isLoading) return null
  if (!isManager) return <Navigate to="/" replace />
  return <>{children}</>
}
