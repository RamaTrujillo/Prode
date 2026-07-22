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
          v-if="homeImg"
          :src="homeImg"
          :alt="match.home_team"
          class="w-6 h-6 object-contain flex-shrink-0"
        />
        <div v-else class="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[9px] font-bold text-slate-300 flex-shrink-0">
          {{ getTeamInitials(match.home_team) }}
        </div>
      </div>

      <!-- Marcador / horario -->
      <div class="text-center min-w-[72px]">
        <p v-if="match.status === 'finished'" class="text-white font-bold text-lg">
          {{ match.home_score }} - {{ match.away_score }}
        </p>
        <p v-else-if="match.status === 'live'" class="text-red-400 font-bold text-lg">
          {{ match.home_score ?? 0 }} - {{ match.away_score ?? 0 }}
        </p>
        <p v-else class="text-slate-400 text-sm">{{ matchTime }}</p>
      </div>

      <!-- Equipo visitante -->
      <div class="flex-1 flex items-center gap-2">
        <img
          v-if="awayImg"
          :src="awayImg"
          :alt="match.away_team"
          class="w-6 h-6 object-contain flex-shrink-0"
        />
        <div v-else class="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[9px] font-bold text-slate-300 flex-shrink-0">
          {{ getTeamInitials(match.away_team) }}
        </div>
        <p class="font-medium text-white text-sm">{{ match.away_team }}</p>
      </div>
    </div>

    <!-- Predicción del usuario -->
    <div v-if="prediction" class="mt-2 text-center">
      <span class="text-xs px-2 py-0.5 rounded-full"
        :class="predictionClasses">
        Tu prode: {{ prediction.home_score }}-{{ prediction.away_score }}
        <span v-if="prediction.points !== null"> · {{ prediction.points }}{{ ptsUnit(prediction.points) }}</span>
      </span>
    </div>
    <div v-else-if="match.status === 'finished'" class="mt-2 text-center">
      <span class="text-xs px-2 py-0.5 rounded-full" :class="pointsBadgeClasses(0)">
        Sin prode · 0{{ ptsUnit(0) }}
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
import { getCrestUrl, getTeamInitials } from '@/utils/crests'
import { getFlagUrl } from '@/utils/flags'
import { pointsBadgeClasses, ptsUnit } from '@/utils/points'
import { useMatchesStore } from '@/stores/matches.store'

const props = defineProps<{
  match: Match
  prediction?: Prediction
}>()

const matchesStore = useMatchesStore()

// Escudo del club (Clausura) o, si no hay, bandera de la selección (Mundial).
// Si no hay ninguno, la UI cae al placeholder con iniciales.
const homeImg = computed(() => getCrestUrl(props.match.home_crest) ?? getFlagUrl(props.match.home_team))
const awayImg = computed(() => getCrestUrl(props.match.away_crest) ?? getFlagUrl(props.match.away_team))

const matchTime = computed(() =>
  new Intl.DateTimeFormat('es-AR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    .format(new Date(props.match.match_date))
)

const stageLabel = computed(() => {
  const { stage, group_name } = props.match
  if (stage === 'group') {
    const term = matchesStore.activeTournament?.group_label ?? 'Grupo'
    if (!group_name) return term === 'Zona' ? 'Fase regular' : 'Fase de grupos'
    return `${term} ${group_name}`
  }
  const map: Record<string, string> = {
    round_of_32: 'Dieciseisavos de final',
    round_of_16: 'Octavos de final',
    quarter: 'Cuartos de final',
    semi: 'Semifinal',
    third_place: 'Tercer puesto',
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

const predictionClasses = computed(() => pointsBadgeClasses(props.prediction?.points ?? null))
</script>
