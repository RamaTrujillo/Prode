import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Match } from '@/types'

export const useMatchesStore = defineStore('matches', () => {
  const matches = ref<Match[]>([])
  const currentMatch = ref<Match | null>(null)
  const loading = ref(false)
  let channel: RealtimeChannel | null = null

  const upcomingMatches = computed(() =>
    matches.value.filter((m: Match) => m.status === 'scheduled')
  )
  const liveMatches = computed(() =>
    matches.value.filter((m: Match) => m.status === 'live')
  )
  const finishedMatches = computed(() =>
    matches.value.filter((m: Match) => m.status === 'finished')
  )
  const matchesByDate = computed(() => {
    return matches.value.reduce<Record<string, Match[]>>((acc: Record<string, Match[]>, match: Match) => {
      const date = match.match_date.slice(0, 10)
      if (!acc[date]) acc[date] = []
      acc[date].push(match)
      return acc
    }, {})
  })

  async function fetchMatches() {
    loading.value = true
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .order('match_date', { ascending: true })
      if (error) throw error
      matches.value = data ?? []
    } finally {
      loading.value = false
    }
  }

  async function fetchMatchById(id: string) {
    const cached = matches.value.find((m: Match) => m.id === id)
    if (cached) {
      currentMatch.value = cached
      return
    }
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    currentMatch.value = data
  }

  function subscribeToMatchUpdates() {
    channel = supabase
      .channel('public:matches')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'matches' },
        (payload: import('@supabase/supabase-js').RealtimePostgresChangesPayload<Match>) => {
          const updated = payload.new as Match
          const idx = matches.value.findIndex((m: Match) => m.id === updated.id)
          if (idx !== -1) matches.value[idx] = updated
          if (currentMatch.value?.id === updated.id) currentMatch.value = updated
        }
      )
      .subscribe()
  }

  function unsubscribe() {
    if (channel) supabase.removeChannel(channel)
  }

  return {
    matches,
    currentMatch,
    loading,
    upcomingMatches,
    liveMatches,
    finishedMatches,
    matchesByDate,
    fetchMatches,
    fetchMatchById,
    subscribeToMatchUpdates,
    unsubscribe,
  }
})
