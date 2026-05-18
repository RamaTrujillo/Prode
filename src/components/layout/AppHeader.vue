<template>
  <header class="sticky top-0 z-50 bg-slate-950/80 backdrop-blur border-b border-slate-800">
    <div class="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
      <RouterLink to="/" class="flex items-center gap-2 font-bold text-white">
        <span>⚽</span>
        <span class="text-sm">Prode 2026</span>
      </RouterLink>
      <RouterLink to="/profile" class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold text-white">
        {{ initial }}
      </RouterLink>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth.store'

const authStore = useAuthStore()
const initial = computed(() =>
  authStore.profile?.username?.charAt(0).toUpperCase() ?? '?'
)
</script>
