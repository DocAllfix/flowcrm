/**
 * useAuth — accesso all'AuthContext con guard obbligatorio.
 *
 * Uso:
 *   const { user, userProfile, isAdmin, isManager, isLoading, logout } = useAuth()
 *
 * Lancia errore se usato al di fuori di <AuthProvider>.
 */

export { useAuthContext as useAuth } from '@/components/layout/AuthProvider'
