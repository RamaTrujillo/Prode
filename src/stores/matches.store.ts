import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { subscribeToTable } from '@/lib/realtime'
import type { Match, Tournament } from '@/types'

export const useMatchesStore = defineStore('matches', () => {
  const matches = ref<Match[]>([])
  const currentMatch = ref<Match | null>(null)
  const activeTournament = ref<Tournament | null>(null)
  const loading = ref(false)
  let channel: RealtimeChannel | null = null

  // Torneo activo (el único que muestra la app). Se cachea tras el primer fetch.
  async function fetchActiveTournament() {
    if (activeTournament.value) return activeTournament.value
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .eq('is_active', true)
      .maybeSingle()
    if (error) throw error
    activeTournament.value = data
    return data
  }

  const upcomingMatches = computed(() =>
    matches.value.filter((m: Match) => m.status === 'scheduled')
  )
  const liveMatches = computed(() =>
    matches.value.filter((m: Match) => m.status === 'live')
  )
  const finishedMatches = computed(() =>
    matches.value.filter((m: Match) => m.status === 'finished')
  )

  async function fetchMatches() {
    loading.value = true
    try {
      const tournament = await fetchActiveTournament()
      let query = supabase
        .from('matches')
        .select('*')
        .order('match_date', { ascending: true })
      // Mostrar solo los partidos del torneo activo (Clausura). El resto
      // (Mundial, etc.) queda en la base como historial pero no se lista.
      if (tournament) query = query.eq('tournament_id', tournament.id)
      const { data, error } = await query
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
    // Filtra el realtime al torneo activo (si ya se conoce), para no recibir
    // updates de partidos de otros torneos.
    const filter = activeTournament.value
      ? `tournament_id=eq.${activeTournament.value.id}`
      : undefined
    channel = subscribeToTable({
      channel: 'public:matches',
      table: 'matches',
      event: 'UPDATE',
      filter,
      onChange: (payload) => {
        const updated = payload.new as Match
        const idx = matches.value.findIndex((m: Match) => m.id === updated.id)
        if (idx !== -1) matches.value[idx] = updated
        if (currentMatch.value?.id === updated.id) currentMatch.value = updated
      },
    })
  }

  function unsubscribe() {
    if (channel) supabase.removeChannel(channel)
  }

  return {
    matches,
    currentMatch,
    activeTournament,
    loading,
    upcomingMatches,
    liveMatches,
    finishedMatches,
    fetchActiveTournament,
    fetchMatches,
    fetchMatchById,
    subscribeToMatchUpdates,
    unsubscribe,
  }
})
