import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth.store'
import type { LeaderboardEntry } from '@/types'

const CACHE_TTL_MS = 60_000

export const useLeaderboardStore = defineStore('leaderboard', () => {
  const entries = ref<LeaderboardEntry[]>([])
  const loading = ref(false)
  const lastFetched = ref<Date | null>(null)
  let channel: RealtimeChannel | null = null

  const currentUserEntry = computed((): LeaderboardEntry | null => {
    const uid = useAuthStore().user?.id
    if (!uid) return null
    return entries.value.find((e: LeaderboardEntry) => e.id === uid) ?? null
  })

  async function fetchLeaderboard(force = false) {
    if (
      !force &&
      lastFetched.value &&
      Date.now() - lastFetched.value.getTime() < CACHE_TTL_MS
    ) return

    loading.value = true
    try {
      const { data, error } = await supabase
        .from('leaderboard')
        .select('*')
      if (error) throw error
      entries.value = (data ?? []) as LeaderboardEntry[]
      lastFetched.value = new Date()
    } finally {
      loading.value = false
    }
  }

  function subscribeToLeaderboard() {
    channel = supabase
      .channel('leaderboard:live')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'users_profile' },
        () => {
          fetchLeaderboard(true)
        }
      )
      .subscribe()
  }

  function unsubscribe() {
    if (channel) supabase.removeChannel(channel)
  }

  return {
    entries,
    loading,
    lastFetched,
    currentUserEntry,
    fetchLeaderboard,
    subscribeToLeaderboard,
    unsubscribe,
  }
})
