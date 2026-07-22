import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth.store'

export function useAuth() {
  const store = useAuthStore()
  const { user, profile, loading, isAuthenticated, isAdmin } = storeToRefs(store)
  return {
    user,
    profile,
    loading,
    isAuthenticated,
    isAdmin,
    signInWithEmail: store.signInWithEmail,
    signOut: store.signOut,
    updateUsername: store.updateUsername,
  }
}
