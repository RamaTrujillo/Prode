import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User, AuthChangeEvent, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { UserProfile } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const profile = ref<UserProfile | null>(null)
  const loading = ref(false)

  const isAuthenticated = computed(() => !!user.value)
  // Admin = role 'admin' en app_metadata (seteado del lado servidor; el claim
  // viaja en el JWT, no es editable por el usuario).
  const isAdmin = computed(() => user.value?.app_metadata?.role === 'admin')

  async function initialize() {
    const { data: { session } } = await supabase.auth.getSession()
    user.value = session?.user ?? null
    if (user.value) await fetchProfile()

    supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      user.value = session?.user ?? null
      // No await de llamadas a Supabase dentro del callback: corre con el lock
      // de auth tomado y deadlockearía updateUser/signOut. Lo diferimos.
      if (user.value) {
        setTimeout(() => { void fetchProfile() }, 0)
      } else {
        profile.value = null
      }
    })
  }

  async function fetchProfile() {
    if (!user.value) return
    const { data } = await supabase
      .from('users_profile')
      .select('*')
      .eq('id', user.value.id)
      .single()
    profile.value = data
  }

  async function signInWithEmail(email: string, password: string) {
    loading.value = true
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    } finally {
      loading.value = false
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function updateUsername(username: string) {
    if (!user.value) return
    const { error } = await supabase
      .from('users_profile')
      .update({ username })
      .eq('id', user.value.id)
    if (error) throw error
    if (profile.value) profile.value.username = username
  }

  return {
    user,
    profile,
    loading,
    isAuthenticated,
    isAdmin,
    initialize,
    fetchProfile,
    signInWithEmail,
    signOut,
    updateUsername,
  }
})
