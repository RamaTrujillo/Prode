<template>
  <div class="max-w-sm mx-auto space-y-6">
    <!-- Info del usuario -->
    <div class="bg-slate-900 rounded-2xl p-6 border border-slate-800 text-center">
      <p class="text-white font-semibold text-lg">{{ profile?.username }}</p>
      <p class="text-slate-500 text-sm">{{ user?.email }}</p>
      <div class="mt-4 inline-flex items-center gap-2 bg-blue-950 text-blue-300 px-4 py-2 rounded-full">
        <span class="text-lg font-bold">{{ profile?.total_pts ?? 0 }}</span>
        <span class="text-sm">puntos</span>
      </div>
    </div>

    <!-- Editar username -->
    <div class="bg-slate-900 rounded-2xl p-6 border border-slate-800">
      <h2 class="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Editar perfil</h2>
      <form @submit.prevent="handleUpdateUsername" class="space-y-3">
        <div>
          <label class="block text-sm text-slate-400 mb-1">Nombre de usuario</label>
          <input
            v-model="username"
            type="text"
            required
            minlength="3"
            class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <p v-if="updateError" class="text-red-400 text-sm">{{ updateError }}</p>
        <button
          type="submit"
          :disabled="savingProfile"
          class="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium py-2 rounded-lg transition-colors"
        >
          {{ savingProfile ? 'Guardando...' : 'Guardar cambios' }}
        </button>
      </form>
    </div>

    <!-- Historial de predicciones -->
    <div class="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
      <h2 class="text-sm font-semibold text-slate-400 uppercase tracking-wider px-4 pt-4 pb-3">
        Historial de predicciones
      </h2>

      <div v-if="loadingHistory" class="flex justify-center py-8">
        <div class="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <div v-else-if="history.length === 0" class="text-center py-8 text-slate-500 text-sm">
        Todavía no hiciste predicciones
      </div>

      <div v-else>
        <div
          v-for="item in history"
          :key="item.id"
          class="flex items-center gap-3 px-4 py-3 border-b border-slate-800 last:border-0"
        >
          <!-- Puntos badge -->
          <span
            class="w-8 text-center text-xs font-bold rounded-full py-0.5"
            :class="pointsClasses(item.points)"
          >
            {{ item.points !== null ? item.points + 'p' : '?' }}
          </span>

          <!-- Match info -->
          <div class="flex-1 min-w-0">
            <p class="text-white text-sm truncate">
              {{ item.match.home_team }} vs {{ item.match.away_team }}
            </p>
            <p class="text-slate-500 text-xs">
              Tu prode: {{ item.home_score }}-{{ item.away_score }}
              <template v-if="item.match.status === 'finished'">
                · Real: {{ item.match.home_score }}-{{ item.match.away_score }}
              </template>
            </p>
          </div>

          <!-- Fecha -->
          <p class="text-slate-600 text-xs flex-shrink-0">{{ matchDay(item.match.match_date) }}</p>
        </div>
      </div>
    </div>

    <!-- Cerrar sesión -->
    <button
      @click="handleSignOut"
      class="w-full text-red-400 hover:text-red-300 border border-red-900 hover:border-red-700 py-2 rounded-xl transition-colors text-sm"
    >
      Cerrar sesión
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'
import { supabase } from '@/lib/supabase'
import type { PredictionWithMatch } from '@/types'

const router = useRouter()
const { user, profile, signOut, updateUsername } = useAuth()
const { success: toastSuccess, error: toastError } = useToast()

const username = ref(profile.value?.username ?? '')
const savingProfile = ref(false)
const updateError = ref('')

watch(() => profile.value?.username, (val) => {
  if (val) username.value = val
})

async function handleUpdateUsername() {
  updateError.value = ''
  savingProfile.value = true
  try {
    await updateUsername(username.value)
    toastSuccess('Nombre actualizado correctamente')
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error al actualizar'
    updateError.value = msg
    toastError(msg)
  } finally {
    savingProfile.value = false
  }
}

async function handleSignOut() {
  await signOut()
  router.push('/login')
}

// Prediction history
const history = ref<PredictionWithMatch[]>([])
const loadingHistory = ref(false)

onMounted(async () => {
  loadingHistory.value = true
  try {
    const { data, error } = await supabase
      .from('predictions')
      .select('*, match:matches(*)')
      .order('created_at', { ascending: false })
    if (error) throw error
    history.value = (data ?? []) as PredictionWithMatch[]
  } finally {
    loadingHistory.value = false
  }
})

function matchDay(dateStr: string) {
  return new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' }).format(new Date(dateStr))
}

function pointsClasses(points: number | null) {
  if (points === null) return 'bg-slate-800 text-slate-400'
  if (points === 3) return 'bg-green-950 text-green-400'
  if (points === 1) return 'bg-yellow-950 text-yellow-400'
  return 'bg-red-950 text-red-400'
}
</script>
