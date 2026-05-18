<template>
  <div class="max-w-lg mx-auto space-y-4">
    <h1 class="text-lg font-bold text-white">Tabla de posiciones</h1>

    <!-- Banner de posición propia -->
    <div
      v-if="myEntry"
      class="flex items-center justify-between bg-blue-950/50 border border-blue-800 rounded-xl px-4 py-3"
    >
      <div class="flex items-center gap-3">
        <span class="font-bold text-blue-300 text-lg">
          {{ myEntry.position <= 3 ? ['🥇','🥈','🥉'][myEntry.position - 1] : `#${myEntry.position}` }}
        </span>
        <span class="text-white text-sm font-medium">Tu posición</span>
      </div>
      <span class="text-blue-300 font-bold tabular-nums">{{ myEntry.total_pts }} pts</span>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <div class="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
    </div>

    <div v-else-if="entries.length === 0" class="text-center py-16 text-slate-500">
      <p class="text-4xl mb-2">🏆</p>
      <p>Todavía no hay posiciones</p>
    </div>

    <div v-else class="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
      <LeaderboardTable :entries="entries" :current-user-id="currentUserId" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useLeaderboard } from '@/composables/useLeaderboard'
import { useAuthStore } from '@/stores/auth.store'
import { useLeaderboardStore } from '@/stores/leaderboard.store'
import { storeToRefs } from 'pinia'
import LeaderboardTable from '@/components/leaderboard/LeaderboardTable.vue'

const { entries, loading } = useLeaderboard()
const authStore = useAuthStore()
const currentUserId = computed(() => authStore.user?.id ?? null)

const leaderboardStore = useLeaderboardStore()
const { currentUserEntry: myEntry } = storeToRefs(leaderboardStore)
</script>
