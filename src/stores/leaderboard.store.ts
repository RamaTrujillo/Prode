import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { subscribeToTable } from '@/lib/realtime'
import { useAuthStore } from '@/stores/auth.store'
import type { LeaderboardEntry } from '@/types'

export const useLeaderboardStore = defineStore('leaderboard', () => {
  const entries = ref<LeaderboardEntry[]>([])
  const loading = ref(false)
  let channel: RealtimeChannel | null = null

  const currentUserEntry = computed((): LeaderboardEntry | null => {
    const uid = useAuthStore().user?.id
    if (!uid) return null
    return entries.value.find((e: LeaderboardEntry) => e.id === uid) ?? null
  })

  async function fetchLeaderboard() {
    loading.value = true
    try {
      const { data, error } = await supabase
        .from('leaderboard')
        .select('*')
      if (error) throw error
      entries.value = (data ?? []) as LeaderboardEntry[]
    } finally {
      loading.value = false
    }
  }

  function subscribeToLeaderboard() {
    channel = subscribeToTable({
      channel: 'leaderboard:live',
      table: 'users_profile',
      event: 'UPDATE',
      onChange: () => {
        fetchLeaderboard()
      },
    })
  }

  function unsubscribe() {
    if (channel) supabase.removeChannel(channel)
  }

  return {
    entries,
    loading,
    currentUserEntry,
    fetchLeaderboard,
    subscribeToLeaderboard,
    unsubscribe,
  }
})
