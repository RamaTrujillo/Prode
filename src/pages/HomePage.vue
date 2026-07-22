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

      <!-- ── Vista por grupos (accordion) ─────────────────────────────── -->
      <template v-if="activeStage === 'group'">
        <div
          v-for="group in groupedMatches"
          :key="group.name"
          class="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden"
        >
          <!-- Header colapsable -->
          <button
            @click="toggleGroup(group.name)"
            class="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-800/50 transition-colors"
          >
            <div class="flex items-center gap-3">
              <span class="text-sm font-semibold text-white">{{ groupTerm }} {{ group.name }}</span>
              <span class="text-xs text-slate-500">{{ group.matches.length }} partidos</span>
              <span v-if="group.liveCount > 0" class="flex items-center gap-1 text-xs text-red-400">
                <span class="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                {{ group.liveCount }} en vivo
              </span>
            </div>
            <svg
              class="w-4 h-4 text-slate-500 transition-transform duration-200"
              :class="openGroups.has(group.name) ? 'rotate-180' : ''"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <!-- Contenido -->
          <div v-if="openGroups.has(group.name)" class="border-t border-slate-800">
            <div class="p-3 space-y-3">
              <MatchCard
                v-for="match in group.matches"
                :key="match.id"
                :match="match"
                :prediction="predictionByMatchId(match.id)"
              />
            </div>
          </div>
        </div>

        <div v-if="groupedMatches.length === 0" class="text-center py-12 text-slate-500">
          <p>No hay partidos de la fase regular todavía</p>
        </div>
      </template>

      <!-- ── Recientes (todos los resultados, sin agrupar) ─────────────── -->
      <template v-else-if="activeStage === 'recent'">
        <section v-if="recentMatches.length > 0">
          <h2 class="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Recientes</h2>
          <div class="space-y-3">
            <MatchCard
              v-for="match in recentMatches"
              :key="match.id"
              :match="match"
              :prediction="predictionByMatchId(match.id)"
            />
          </div>
        </section>
        <div v-else class="text-center py-12 text-slate-500">
          <p>Todavía no hay resultados</p>
        </div>
      </template>

      <!-- ── Vista normal (en vivo / próximos) ─────────────────────────── -->
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

        <!-- Sin partidos -->
        <div v-if="filteredAll.length === 0 && matches.length > 0" class="text-center py-12 text-slate-500">
          <p>No hay partidos en esta fase todavía</p>
        </div>
        <div v-if="matches.length === 0" class="text-center py-16 text-slate-500">
          <p class="text-4xl mb-2">📅</p>
          <p>No hay partidos cargados todavía</p>
        </div>
      </template>

    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted, type Ref, type ComputedRef } from 'vue'
import { useMatches } from '@/composables/useMatches'
import { usePredictions } from '@/composables/usePredictions'
import { useMatchesStore } from '@/stores/matches.store'
import MatchCard from '@/components/matches/MatchCard.vue'
import MatchCardSkeleton from '@/components/matches/MatchCardSkeleton.vue'
import type { Match, MatchStage } from '@/types'

// Nombre explícito para que <keep-alive :include="['home']"> conserve esta vista.
defineOptions({ name: 'home' })

const { matches, loading, upcomingMatches, liveMatches, finishedMatches } = useMatches()
const { predictionByMatchId } = usePredictions()
const matchesStore = useMatchesStore()

// ── Stage filter ────────────────────────────────────────────────────────────
type StageFilter = MatchStage | 'all' | 'recent'
const activeStage = ref<StageFilter>('all')

// Término de la fase de grupos según el torneo activo ('Zona' / 'Grupo').
const groupTerm = computed(() => matchesStore.activeTournament?.group_label ?? 'Grupo')

// Orden canónico de fases y sus labels (para los playoffs). La fase 'group' usa
// el término del torneo ('Zonas' / 'Grupos'), por eso no está en este mapa.
const STAGE_ORDER: MatchStage[] = ['group', 'round_of_32', 'round_of_16', 'quarter', 'semi', 'third_place', 'final']
const STAGE_TAB_LABELS: Partial<Record<MatchStage, string>> = {
  round_of_32: '16avos',
  round_of_16: 'Octavos',
  quarter: 'Cuartos',
  semi: 'Semis',
  third_place: '3er puesto',
  final: 'Final',
}

// Fases realmente presentes en el torneo activo (así los tabs se adaptan solos
// a cada torneo: el Clausura no muestra 16avos/3er puesto, el Mundial sí).
const presentStages = computed(() => {
  const set = new Set(matches.value.map((m: Match) => m.stage))
  return STAGE_ORDER.filter(s => set.has(s))
})

const tabs = computed<{ label: string; value: StageFilter }[]>(() => [
  { label: 'Próximos', value: 'all' },
  { label: 'Recientes', value: 'recent' },
  ...presentStages.value.map(s => ({
    label: s === 'group' ? `${groupTerm.value}s` : (STAGE_TAB_LABELS[s] ?? s),
    value: s as StageFilter,
  })),
])

function filterByStage<T extends { stage: MatchStage }>(list: T[]) {
  if (activeStage.value === 'all') return list
  return list.filter(m => m.stage === activeStage.value)
}

const filteredLive = computed(() => filterByStage(liveMatches.value))
const filteredUpcoming = computed(() => filterByStage(upcomingMatches.value))
const filteredAll = computed(() => [...filteredLive.value, ...filteredUpcoming.value])

// ── Recientes: todos los resultados finalizados, sin agrupar, más reciente primero
const recentMatches = computed(() =>
  finishedMatches.value
    .slice()
    .sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime())
)

// ── Vista por grupos (accordion) ────────────────────────────────────────────
const openGroups = ref<Set<string>>(new Set())

function toggleGroup(name: string) {
  const next = new Set(openGroups.value)
  if (next.has(name)) next.delete(name)
  else next.add(name)
  openGroups.value = next
}

const groupedMatches = computed(() => {
  const groupMatches = matches.value.filter(m => m.stage === 'group' && m.group_name)
  const map = new Map<string, Match[]>()
  for (const m of groupMatches) {
    const g = m.group_name!
    if (!map.has(g)) map.set(g, [])
    map.get(g)!.push(m)
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, list]) => ({
      name,
      matches: list.slice().sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime()),
      liveCount: list.filter(m => m.status === 'live').length,
    }))
})

// ── Infinite scroll (solo "Próximos") ───────────────────────────────────────
const BATCH = 10
const INITIAL = 10

const upcomingCount = ref(INITIAL)
const loadingMoreUpcoming = ref(false)

const visibleUpcoming = computed(() => filteredUpcoming.value.slice(0, upcomingCount.value))

watch([activeStage, filteredUpcoming], () => {
  upcomingCount.value = INITIAL
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

const upcomingSentinel = ref<HTMLElement | null>(null)

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

watch(upcomingSentinel, (el) => {
  upcomingObserver?.disconnect()
  if (!el) return
  upcomingObserver = makeObserver(upcomingCount, filteredUpcoming, loadingMoreUpcoming)
  upcomingObserver.observe(el)
})

onUnmounted(() => {
  upcomingObserver?.disconnect()
})
</script>
