<template>
  <div class="max-w-lg mx-auto space-y-6">
    <div>
      <h1 class="text-xl font-bold text-white">Panel de carga</h1>
      <p class="text-sm text-slate-400 mt-1">
        {{ activeTournament?.name ?? 'Torneo activo' }} · cargá partidos y resultados
      </p>
    </div>

    <!-- ── Nuevo partido ─────────────────────────────────────────────── -->
    <section class="bg-slate-900 rounded-2xl p-5 border border-slate-800 space-y-3">
      <h2 class="text-sm font-semibold text-slate-300 uppercase tracking-wider">Nuevo partido</h2>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs text-slate-400 mb-1">Local</label>
          <input v-model="form.home_team" type="text" placeholder="Boca Juniors" :class="inputClass" />
        </div>
        <div>
          <label class="block text-xs text-slate-400 mb-1">Visitante</label>
          <input v-model="form.away_team" type="text" placeholder="River Plate" :class="inputClass" />
        </div>
      </div>

      <div>
        <label class="block text-xs text-slate-400 mb-1">Fecha y hora</label>
        <input v-model="form.dateLocal" type="datetime-local" :class="inputClass" />
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs text-slate-400 mb-1">Fase</label>
          <select v-model="form.stage" :class="inputClass">
            <option v-for="s in stages" :key="s.value" :value="s.value">{{ s.label }}</option>
          </select>
        </div>
        <div v-if="form.stage === 'group'">
          <label class="block text-xs text-slate-400 mb-1">{{ groupTerm }}</label>
          <select v-model="form.group_name" :class="inputClass">
            <option value="">—</option>
            <option value="A">{{ groupTerm }} A</option>
            <option value="B">{{ groupTerm }} B</option>
          </select>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs text-slate-400 mb-1">Escudo local (URL, opcional)</label>
          <input v-model="form.home_crest" type="url" placeholder="https://…" :class="inputClass" />
        </div>
        <div>
          <label class="block text-xs text-slate-400 mb-1">Escudo visitante (URL, opcional)</label>
          <input v-model="form.away_crest" type="url" placeholder="https://…" :class="inputClass" />
        </div>
      </div>

      <button
        @click="createMatch"
        :disabled="saving || !canCreate"
        class="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl transition-colors"
      >
        {{ saving ? 'Guardando…' : 'Agregar partido' }}
      </button>
    </section>

    <!-- ── Partidos cargados ─────────────────────────────────────────── -->
    <section class="space-y-3">
      <h2 class="text-sm font-semibold text-slate-300 uppercase tracking-wider">
        Partidos cargados ({{ matches.length }})
      </h2>

      <p class="text-xs text-slate-500">
        Al marcar un partido como <span class="text-slate-300">Finalizado</span> con su marcador, los puntos se calculan solos.
      </p>

      <div v-if="matches.length === 0" class="text-center py-10 text-slate-500 text-sm">
        Todavía no hay partidos cargados
      </div>

      <div
        v-for="m in matches"
        :key="m.id"
        class="bg-slate-900 rounded-xl p-4 border border-slate-800 space-y-3"
      >
        <div class="flex items-center justify-between gap-2">
          <div class="text-sm text-white font-medium">{{ m.home_team }} vs {{ m.away_team }}</div>
          <button @click="removeMatch(m)" class="text-slate-500 hover:text-red-400 text-xs">🗑 Borrar</button>
        </div>
        <div class="text-xs text-slate-500">{{ formatDate(m.match_date) }} · {{ stageLabel(m) }}</div>

        <div v-if="drafts[m.id]" class="flex items-center gap-2">
          <input v-model.number="drafts[m.id].home_score" type="number" min="0" max="30" class="w-14 text-center bg-slate-800 border border-slate-700 rounded-lg py-1.5 text-white" />
          <span class="text-slate-600">-</span>
          <input v-model.number="drafts[m.id].away_score" type="number" min="0" max="30" class="w-14 text-center bg-slate-800 border border-slate-700 rounded-lg py-1.5 text-white" />
          <select v-model="drafts[m.id].status" class="flex-1 bg-slate-800 border border-slate-700 rounded-lg py-1.5 px-2 text-white text-sm">
            <option value="scheduled">Programado</option>
            <option value="live">En vivo</option>
            <option value="finished">Finalizado</option>
          </select>
          <button
            @click="saveResult(m)"
            :disabled="savingId === m.id"
            class="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-sm px-3 py-1.5 rounded-lg"
          >
            {{ savingId === m.id ? '…' : 'Guardar' }}
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { supabase } from '@/lib/supabase'
import { useMatchesStore } from '@/stores/matches.store'
import { useToast } from '@/composables/useToast'
import type { Match, MatchStage, MatchStatus } from '@/types'

const store = useMatchesStore()
const { matches, activeTournament } = storeToRefs(store)
const { success: toastSuccess, error: toastError } = useToast()

const inputClass =
  'w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

const stages: { label: string; value: MatchStage }[] = [
  { label: 'Fase regular / grupo', value: 'group' },
  { label: 'Octavos', value: 'round_of_16' },
  { label: 'Cuartos', value: 'quarter' },
  { label: 'Semifinal', value: 'semi' },
  { label: 'Final', value: 'final' },
]

const groupTerm = computed(() => activeTournament.value?.group_label ?? 'Zona')

const form = reactive({
  home_team: '',
  away_team: '',
  dateLocal: '',
  stage: 'group' as MatchStage,
  group_name: '',
  home_crest: '',
  away_crest: '',
})

const saving = ref(false)
const savingId = ref<string | null>(null)

const canCreate = computed(() =>
  form.home_team.trim() && form.away_team.trim() && form.dateLocal
)

// Borradores editables de resultado/estado por partido (se reconstruyen en cada fetch).
const drafts = reactive<Record<string, { home_score: number | null; away_score: number | null; status: MatchStatus }>>({})
watch(matches, (ms) => {
  for (const k of Object.keys(drafts)) delete drafts[k]
  for (const m of ms) {
    drafts[m.id] = { home_score: m.home_score, away_score: m.away_score, status: m.status }
  }
}, { immediate: true })

onMounted(async () => {
  await store.fetchActiveTournament()
  await store.fetchMatches()
})

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('es-AR', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

function stageLabel(m: Match) {
  if (m.stage === 'group') return m.group_name ? `${groupTerm.value} ${m.group_name}` : 'Fase regular'
  return stages.find(s => s.value === m.stage)?.label ?? m.stage
}

async function createMatch() {
  if (!canCreate.value || !activeTournament.value) return
  saving.value = true
  try {
    const row = {
      external_id: `manual-${crypto.randomUUID()}`,
      tournament_id: activeTournament.value.id,
      match_date: new Date(form.dateLocal).toISOString(),
      home_team: form.home_team.trim(),
      away_team: form.away_team.trim(),
      home_crest: form.home_crest.trim() || null,
      away_crest: form.away_crest.trim() || null,
      status: 'scheduled' as MatchStatus,
      stage: form.stage,
      group_name: form.stage === 'group' && form.group_name ? form.group_name : null,
      home_score: null,
      away_score: null,
    }
    const { error } = await supabase.from('matches').insert(row)
    if (error) throw error
    toastSuccess('Partido agregado')
    form.home_team = ''
    form.away_team = ''
    form.dateLocal = ''
    form.group_name = ''
    form.home_crest = ''
    form.away_crest = ''
    await store.fetchMatches()
  } catch (e: unknown) {
    toastError(e instanceof Error ? e.message : 'No se pudo agregar el partido')
  } finally {
    saving.value = false
  }
}

async function saveResult(m: Match) {
  const d = drafts[m.id]
  if (!d) return
  savingId.value = m.id
  try {
    const patch = {
      home_score: Number.isFinite(d.home_score as number) ? d.home_score : null,
      away_score: Number.isFinite(d.away_score as number) ? d.away_score : null,
      status: d.status,
    }
    const { error } = await supabase.from('matches').update(patch).eq('id', m.id)
    if (error) throw error
    toastSuccess('Partido actualizado')
    await store.fetchMatches()
  } catch (e: unknown) {
    toastError(e instanceof Error ? e.message : 'No se pudo actualizar')
  } finally {
    savingId.value = null
  }
}

async function removeMatch(m: Match) {
  if (!confirm(`¿Borrar ${m.home_team} vs ${m.away_team}?`)) return
  try {
    const { error } = await supabase.from('matches').delete().eq('id', m.id)
    if (error) throw error
    toastSuccess('Partido borrado')
    await store.fetchMatches()
  } catch (e: unknown) {
    toastError(e instanceof Error ? e.message : 'No se pudo borrar')
  }
}
</script>
