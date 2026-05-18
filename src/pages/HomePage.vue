<template>
  <div class="space-y-6">
    <!-- Stage filter tabs -->
    <div class="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        @click="activeStage = tab.value"
        class="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
        :class="activeStage === tab.value
          ? 'bg-blue-600 text-white'
          : 'bg-slate-800 text-slate-400 hover:text-white'"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Initial skeleton -->
    <template v-if="loading">
      <div class="space-y-3">
        <MatchCardSkeleton v-for="i in 8" :key="i" />
      </div>
    </template>

    <template v-else>
      <!-- En vivo -->
      <section v-if="filteredLive.length > 0">
        <h2 class="text-sm font-semibold text-red-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
          En vivo
        </h2>
        <div class="space-y-3">
          <MatchCard
            v-for="match in filteredLive"
            :key="match.id"
            :match="match"
            :prediction="predictionByMatchId(match.id)"
          />
        </div>
      </section>

      <!-- Próximos — infinite scroll -->
      <section v-if="filteredUpcoming.length > 0">
        <h2 class="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Próximos</h2>
        <div class="space-y-3">
          <MatchCard
            v-for="match in visibleUpcoming"
            :key="match.id"
            :match="match"
            :prediction="predictionByMatchId(match.id)"
          />
          <template v-if="loadingMoreUpcoming">
            <MatchCardSkeleton v-for="i in 3" :key="`u-skel-${i}`" />
          </template>
        </div>
        <div ref="upcomingSentinel" class="h-px" />
      </section>

      <!-- Recientes — infinite scroll -->
      <section v-if="filteredRecent.length > 0">
        <h2 class="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Recientes</h2>
        <div class="space-y-3">
          <MatchCard
            v-for="match in visibleRecent"
            :key="match.id"
            :match="match"
            :prediction="predictionByMatchId(match.id)"
          />
          <template v-if="loadingMoreRecent">
            <MatchCardSkeleton v-for="i in 3" :key="`r-skel-${i}`" />
          </template>
        </div>
        <div ref="recentSentinel" class="h-px" />
      </section>

      <!-- Sin partidos -->
      <div v-if="filteredAll.length === 0 && matches.length > 0" class="text-center py-12 text-slate-500">
        <p>No hay partidos en esta fase todavía</p>
      </div>
      <div v-if="matches.length === 0" class="text-center py-16 text-slate-500">
        <p class="text-4xl mb-2">📅</p>
        <p>No hay partidos cargados todavía</p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted, type Ref, type ComputedRef } from 'vue'
import { useMatches } from '@/composables/useMatches'
import { usePredictionsStore } from '@/stores/predictions.store'
import { storeToRefs } from 'pinia'
import MatchCard from '@/components/matches/MatchCard.vue'
import MatchCardSkeleton from '@/components/matches/MatchCardSkeleton.vue'
import type { MatchStage } from '@/types'

const { matches, loading, upcomingMatches, liveMatches, finishedMatches } = useMatches()
const predictionsStore = usePredictionsStore()
const { predictionByMatchId } = storeToRefs(predictionsStore)

// ── Stage filter ────────────────────────────────────────────────────────────
type StageFilter = MatchStage | 'all'
const activeStage = ref<StageFilter>('all')

const tabs: { label: string; value: StageFilter }[] = [
  { label: 'Todos', value: 'all' },
  { label: 'Grupos', value: 'group' },
  { label: 'Octavos', value: 'round_of_16' },
  { label: 'Cuartos', value: 'quarter' },
  { label: 'Semis', value: 'semi' },
  { label: 'Final', value: 'final' },
]

function filterByStage<T extends { stage: MatchStage }>(list: T[]) {
  if (activeStage.value === 'all') return list
  return list.filter(m => m.stage === activeStage.value)
}

const filteredLive = computed(() => filterByStage(liveMatches.value))
const filteredUpcoming = computed(() => filterByStage(upcomingMatches.value))
const filteredRecent = computed(() => filterByStage(finishedMatches.value).slice().reverse())
const filteredAll = computed(() => [...filteredLive.value, ...filteredUpcoming.value, ...filteredRecent.value])

// ── Infinite scroll ─────────────────────────────────────────────────────────
const BATCH = 10
const INITIAL = 10

const upcomingCount = ref(INITIAL)
const recentCount = ref(INITIAL)
const loadingMoreUpcoming = ref(false)
const loadingMoreRecent = ref(false)

const visibleUpcoming = computed(() => filteredUpcoming.value.slice(0, upcomingCount.value))
const visibleRecent = computed(() => filteredRecent.value.slice(0, recentCount.value))

// Reset counters when stage or data changes
watch([activeStage, filteredUpcoming, filteredRecent], () => {
  upcomingCount.value = INITIAL
  recentCount.value = INITIAL
})

async function loadMore(
  count: Ref<number>,
  total: ComputedRef<unknown[]>,
  loadingFlag: Ref<boolean>,
) {
  if (loadingFlag.value || count.value >= total.value.length) return
  loadingFlag.value = true
  await new Promise(r => setTimeout(r, 350))
  count.value = Math.min(count.value + BATCH, total.value.length)
  loadingFlag.value = false
}

// Intersection Observer factory
const upcomingSentinel = ref<HTMLElement | null>(null)
const recentSentinel = ref<HTMLElement | null>(null)

function makeObserver(
  count: Ref<number>,
  total: ComputedRef<unknown[]>,
  loadingFlag: Ref<boolean>,
) {
  return new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) loadMore(count, total, loadingFlag)
    },
    { rootMargin: '300px' },
  )
}

let upcomingObserver: IntersectionObserver | null = null
let recentObserver: IntersectionObserver | null = null

watch(upcomingSentinel, (el) => {
  upcomingObserver?.disconnect()
  if (!el) return
  upcomingObserver = makeObserver(upcomingCount, filteredUpcoming, loadingMoreUpcoming)
  upcomingObserver.observe(el)
})

watch(recentSentinel, (el) => {
  recentObserver?.disconnect()
  if (!el) return
  recentObserver = makeObserver(recentCount, filteredRecent, loadingMoreRecent)
  recentObserver.observe(el)
})

onUnmounted(() => {
  upcomingObserver?.disconnect()
  recentObserver?.disconnect()
})
</script>
