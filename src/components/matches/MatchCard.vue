<template>
  <RouterLink
    :to="`/match/${match.id}`"
    class="block bg-slate-900 hover:bg-slate-800 border rounded-xl p-4 transition-colors"
    :class="match.status === 'live' ? 'border-red-800' : 'border-slate-800'"
  >
    <!-- Stage / group label -->
    <div class="flex items-center justify-between mb-2">
      <span class="text-xs text-slate-500">{{ stageLabel }}</span>
      <span v-if="deadlineLabel" class="text-xs text-amber-400 font-medium">{{ deadlineLabel }}</span>
    </div>

    <div class="flex items-center justify-between gap-2">
      <!-- Equipo local -->
      <div class="flex-1 flex items-center justify-end gap-2">
        <p class="font-medium text-white text-sm text-right">{{ match.home_team }}</p>
        <img
          v-if="homeFlag"
          :src="homeFlag"
          :alt="match.home_team"
          class="w-6 h-[18px] object-cover rounded-[2px] flex-shrink-0"
        />
        <div v-else class="w-6 h-[18px] bg-slate-700 rounded-[2px] flex-shrink-0" />
      </div>

      <!-- Marcador / horario -->
      <div class="text-center min-w-[72px]">
        <p v-if="match.status === 'finished'" class="text-white font-bold text-lg">
          {{ match.home_score }} - {{ match.away_score }}
        </p>
        <p v-else-if="match.status === 'live'" class="text-red-400 font-bold text-sm animate-pulse">
          EN VIVO
        </p>
        <p v-else class="text-slate-400 text-sm">{{ matchTime }}</p>
      </div>

      <!-- Equipo visitante -->
      <div class="flex-1 flex items-center gap-2">
        <img
          v-if="awayFlag"
          :src="awayFlag"
          :alt="match.away_team"
          class="w-6 h-[18px] object-cover rounded-[2px] flex-shrink-0"
        />
        <div v-else class="w-6 h-[18px] bg-slate-700 rounded-[2px] flex-shrink-0" />
        <p class="font-medium text-white text-sm">{{ match.away_team }}</p>
      </div>
    </div>

    <!-- Predicción del usuario -->
    <div v-if="prediction" class="mt-2 text-center">
      <span class="text-xs px-2 py-0.5 rounded-full"
        :class="predictionClasses">
        Tu prode: {{ prediction.home_score }}-{{ prediction.away_score }}
        <span v-if="prediction.points !== null"> · {{ prediction.points }}pts</span>
      </span>
    </div>
    <div v-else-if="match.status === 'scheduled'" class="mt-2 text-center">
      <span class="text-xs text-slate-600">Sin predicción</span>
    </div>
  </RouterLink>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Match, Prediction } from '@/types'
import { getFlagUrl } from '@/utils/flags'

const props = defineProps<{
  match: Match
  prediction?: Prediction
}>()

const homeFlag = computed(() => getFlagUrl(props.match.home_team))
const awayFlag = computed(() => getFlagUrl(props.match.away_team))

const matchTime = computed(() =>
  new Intl.DateTimeFormat('es-AR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    .format(new Date(props.match.match_date))
)

const stageLabel = computed(() => {
  const { stage, group_name } = props.match
  if (stage === 'group') return group_name ? `Grupo ${group_name}` : 'Fase de grupos'
  const map: Record<string, string> = {
    round_of_16: 'Octavos de final',
    quarter: 'Cuartos de final',
    semi: 'Semifinal',
    final: 'Final',
  }
  return map[stage] ?? stage
})

const deadlineLabel = computed(() => {
  if (props.match.status !== 'scheduled') return null
  const msUntil = new Date(props.match.match_date).getTime() - Date.now()
  const hoursUntil = msUntil / 3_600_000
  if (hoursUntil < 0 || hoursUntil > 24) return null
  if (hoursUntil < 1) return 'Cierra pronto'
  return `Cierra en ${Math.floor(hoursUntil)}hs`
})

const predictionClasses = computed(() => {
  const p = props.prediction
  if (!p || p.points === null) return 'bg-slate-800 text-slate-400'
  if (p.points === 3) return 'bg-green-950 text-green-400'
  if (p.points === 1) return 'bg-yellow-950 text-yellow-400'
  return 'bg-red-950 text-red-400'
})
</script>
