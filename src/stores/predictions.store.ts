import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Prediction } from '@/types'

export const usePredictionsStore = defineStore('predictions', () => {
  const predictions = ref<Prediction[]>([])
  const loading = ref(false)
  const saving = ref(false)
  let channel: RealtimeChannel | null = null

  const predictionByMatchId = computed(
    () => (matchId: string) => predictions.value.find((p: Prediction) => p.match_id === matchId)
  )

  const totalPoints = computed(() =>
    predictions.value.reduce((sum: number, p: Prediction) => sum + (p.points ?? 0), 0)
  )

  async function fetchUserPredictions() {
    loading.value = true
    try {
      const { data, error } = await supabase
        .from('predictions')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      predictions.value = data ?? []
    } finally {
      loading.value = false
    }
  }

  async function upsertPrediction(matchId: string, homeScore: number, awayScore: number) {
    saving.value = true
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      const { data, error } = await supabase
        .from('predictions')
        .upsert(
          {
            user_id: user.id,
            match_id: matchId,
            home_score: homeScore,
            away_score: awayScore,
          },
          { onConflict: 'user_id,match_id' }
        )
        .select()
        .single()

      if (error) throw error

      const idx = predictions.value.findIndex((p: Prediction) => p.match_id === matchId)
      if (idx !== -1) {
        predictions.value[idx] = data
      } else {
        predictions.value.unshift(data)
      }
    } finally {
      saving.value = false
    }
  }

  function subscribeToPointsUpdates() {
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id
      if (!uid) return
      channel = supabase
        .channel('predictions:points')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'predictions',
            filter: `user_id=eq.${uid}`,
          },
          (payload: import('@supabase/supabase-js').RealtimePostgresChangesPayload<Prediction>) => {
            const updated = payload.new as Prediction
            const idx = predictions.value.findIndex((p: Prediction) => p.id === updated.id)
            if (idx !== -1) predictions.value[idx] = updated
          }
        )
        .subscribe()
    })
  }

  function unsubscribe() {
    if (channel) supabase.removeChannel(channel)
  }

  return {
    predictions,
    loading,
    saving,
    predictionByMatchId,
    totalPoints,
    fetchUserPredictions,
    upsertPrediction,
    subscribeToPointsUpdates,
    unsubscribe,
  }
})
