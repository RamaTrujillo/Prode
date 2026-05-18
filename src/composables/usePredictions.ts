import { ref, computed, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { usePredictionsStore } from '@/stores/predictions.store'
import type { Match } from '@/types'

export function usePredictions() {
  const store = usePredictionsStore()
  const { predictions, loading, saving, predictionByMatchId, totalPoints } = storeToRefs(store)

  onMounted(async () => {
    await store.fetchUserPredictions()
    store.subscribeToPointsUpdates()
  })

  onUnmounted(() => {
    store.unsubscribe()
  })

  return {
    predictions,
    loading,
    saving,
    predictionByMatchId,
    totalPoints,
    upsertPrediction: store.upsertPrediction,
  }
}

export function usePredictionForm(match: Match) {
  const store = usePredictionsStore()
  const existing = computed(() => store.predictionByMatchId(match.id))

  const homeScore = ref(existing.value?.home_score ?? 0)
  const awayScore = ref(existing.value?.away_score ?? 0)
  const saving = ref(false)
  const error = ref<string | null>(null)

  const canPredict = computed(() => {
    return match.status === 'scheduled' && new Date(match.match_date) > new Date()
  })

  async function submit() {
    if (!canPredict.value) return
    error.value = null
    saving.value = true
    try {
      await store.upsertPrediction(match.id, homeScore.value, awayScore.value)
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Error al guardar la predicción'
    } finally {
      saving.value = false
    }
  }

  return { homeScore, awayScore, saving, error, canPredict, existing, submit }
}
