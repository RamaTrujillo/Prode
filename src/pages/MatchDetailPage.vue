<template>
  <div v-if="match" class="max-w-lg mx-auto space-y-6">
    <!-- Header del partido -->
    <div class="bg-slate-900 rounded-2xl p-6 border border-slate-800">
      <div class="text-center mb-4">
        <span class="text-xs px-2 py-0.5 rounded-full font-medium"
          :class="statusClasses">
          {{ statusLabel }}
        </span>
        <p class="text-slate-500 text-sm mt-2">{{ formattedDate }}</p>
      </div>

      <div class="flex items-center justify-between gap-4">
        <div class="flex-1 flex flex-col items-center gap-2">
          <img
            v-if="homeFlag"
            :src="homeFlag"
            :alt="match.home_team"
            class="w-12 h-9 object-cover rounded-[3px] shadow"
          />
          <p class="font-semibold text-white text-sm text-center">{{ match.home_team }}</p>
        </div>

        <div class="text-center">
          <p v-if="match.status === 'finished'" class="text-3xl font-bold text-white">
            {{ match.home_score }} - {{ match.away_score }}
          </p>
          <p v-else class="text-2xl text-slate-500 font-light">vs</p>
        </div>

        <div class="flex-1 flex flex-col items-center gap-2">
          <img
            v-if="awayFlag"
            :src="awayFlag"
            :alt="match.away_team"
            class="w-12 h-9 object-cover rounded-[3px] shadow"
          />
          <p class="font-semibold text-white text-sm text-center">{{ match.away_team }}</p>
        </div>
      </div>
    </div>

    <!-- Predicción existente / formulario -->
    <div class="bg-slate-900 rounded-2xl p-6 border border-slate-800">
      <h2 class="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Tu predicción</h2>

      <!-- Partido finalizado -->
      <div v-if="match.status === 'finished'" class="text-center space-y-2">
        <div v-if="existing">
          <p class="text-slate-300">Predijiste: <span class="text-white font-bold">{{ existing.home_score }} - {{ existing.away_score }}</span></p>
          <p class="text-slate-300">Resultado: <span class="text-white font-bold">{{ match.home_score }} - {{ match.away_score }}</span></p>
          <p class="mt-3 text-2xl font-bold"
            :class="existing.points === 3 ? 'text-green-400' : existing.points === 1 ? 'text-yellow-400' : 'text-red-400'">
            {{ existing.points ?? '?' }} pts
          </p>
        </div>
        <p v-else class="text-slate-500 text-sm">No hiciste predicción para este partido</p>
      </div>

      <!-- Formulario de predicción abierto -->
      <div v-else-if="canPredict">
        <div class="flex items-center gap-4 justify-center">
          <div class="text-center">
            <p class="text-xs text-slate-500 mb-2">{{ match.home_team }}</p>
            <input
              v-model.number="homeScore"
              type="number"
              min="0"
              max="20"
              class="w-16 h-16 text-center text-2xl font-bold bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <span class="text-slate-600 text-xl font-light mt-4">-</span>
          <div class="text-center">
            <p class="text-xs text-slate-500 mb-2">{{ match.away_team }}</p>
            <input
              v-model.number="awayScore"
              type="number"
              min="0"
              max="20"
              class="w-16 h-16 text-center text-2xl font-bold bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <p v-if="existing" class="text-center text-xs text-slate-500 mt-3">
          Predicción actual: {{ existing.home_score }} - {{ existing.away_score }}
        </p>

        <p v-if="formError" class="text-red-400 text-sm text-center mt-3">{{ formError }}</p>

        <button
          @click="submitPrediction"
          :disabled="formSaving"
          class="w-full mt-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-colors"
        >
          {{ formSaving ? 'Guardando...' : existing ? 'Actualizar predicción' : 'Guardar predicción' }}
        </button>
      </div>

      <!-- Partido cerrado -->
      <div v-else class="text-center py-4">
        <p class="text-slate-500 text-sm">Las predicciones están cerradas para este partido</p>
        <div v-if="existing" class="mt-3">
          <p class="text-slate-300">Tu predicción: <span class="text-white font-bold">{{ existing.home_score }} - {{ existing.away_score }}</span></p>
        </div>
      </div>
    </div>
  </div>

  <!-- Loading / no encontrado -->
  <div v-else class="flex justify-center py-16">
    <div v-if="loading" class="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
    <p v-else class="text-slate-500">Partido no encontrado</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useMatchesStore } from '@/stores/matches.store'
import { usePredictionsStore } from '@/stores/predictions.store'
import { useToast } from '@/composables/useToast'
import { getFlagUrlLarge } from '@/utils/flags'

const route = useRoute()
const matchesStore = useMatchesStore()
const { currentMatch: match, loading } = storeToRefs(matchesStore)

matchesStore.fetchMatchById(route.params.id as string)

const predictionsStore = usePredictionsStore()
const { success: toastSuccess, error: toastError } = useToast()

const homeFlag = computed(() => match.value ? getFlagUrlLarge(match.value.home_team) : null)
const awayFlag = computed(() => match.value ? getFlagUrlLarge(match.value.away_team) : null)
const existing = computed(() =>
  match.value ? predictionsStore.predictionByMatchId(match.value.id) : undefined
)

const homeScore = ref(existing.value?.home_score ?? 0)
const awayScore = ref(existing.value?.away_score ?? 0)
const formSaving = ref(false)
const formError = ref<string | null>(null)

// Cuando carga la predicción existente, inicializar los inputs
watch(existing, (pred) => {
  if (pred) {
    homeScore.value = pred.home_score
    awayScore.value = pred.away_score
  }
})

const canPredict = computed(() => {
  if (!match.value) return false
  return match.value.status === 'scheduled' && new Date(match.value.match_date) > new Date()
})

async function submitPrediction() {
  if (!match.value || !canPredict.value) return
  formError.value = null
  formSaving.value = true
  const isUpdate = !!existing.value
  try {
    await predictionsStore.upsertPrediction(match.value.id, homeScore.value, awayScore.value)
    toastSuccess(isUpdate ? 'Predicción actualizada' : 'Predicción guardada')
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error al guardar la predicción'
    formError.value = msg
    toastError(msg)
  } finally {
    formSaving.value = false
  }
}

const formattedDate = computed(() => {
  if (!match.value) return ''
  return new Intl.DateTimeFormat('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  }).format(new Date(match.value.match_date))
})

const statusLabel = computed(() => {
  if (!match.value) return ''
  const map: Record<string, string> = { scheduled: 'Programado', live: 'En vivo', finished: 'Finalizado' }
  return map[match.value.status] ?? match.value.status
})

const statusClasses = computed(() => {
  if (!match.value) return ''
  const map: Record<string, string> = {
    scheduled: 'bg-slate-800 text-slate-300',
    live: 'bg-red-950 text-red-400',
    finished: 'bg-slate-800 text-slate-400',
  }
  return map[match.value.status] ?? 'bg-slate-800 text-slate-400'
})

watch(() => route.params.id, (id) => {
  matchesStore.fetchMatchById(id as string)
})
</script>
