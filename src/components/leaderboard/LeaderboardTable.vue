<template>
  <div>
    <div
      v-for="entry in entries"
      :key="entry.id"
      class="flex items-center gap-3 px-4 py-3 border-b border-slate-800 last:border-0"
      :class="entry.id === currentUserId ? 'bg-blue-950/30' : ''"
    >
      <!-- Posición -->
      <span class="w-6 text-center font-bold"
        :class="entry.position === 1 ? 'text-yellow-400' : entry.position === 2 ? 'text-slate-300' : entry.position === 3 ? 'text-amber-600' : 'text-slate-500'">
        {{ entry.position <= 3 ? ['🥇','🥈','🥉'][entry.position - 1] : entry.position }}
      </span>

      <!-- Nombre -->
      <p class="flex-1 text-white text-sm font-medium truncate">
        {{ entry.username }}
        <span v-if="entry.id === currentUserId" class="text-xs text-blue-400 ml-1">(vos)</span>
      </p>

      <!-- Puntos -->
      <p class="text-white font-bold tabular-nums">{{ entry.total_pts }}</p>
      <span class="text-slate-500 text-xs">pts</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LeaderboardEntry } from '@/types'

defineProps<{
  entries: LeaderboardEntry[]
  currentUserId: string | null
}>()
</script>
