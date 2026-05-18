<template>
  <nav class="fixed bottom-0 inset-x-0 z-50 bg-slate-950/90 backdrop-blur border-t border-slate-800">
    <div class="max-w-2xl mx-auto flex">
      <RouterLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="flex-1 flex flex-col items-center justify-center gap-0.5 py-3 text-xs transition-colors"
        :class="($route.path === item.to || ($route.path.startsWith('/match') && item.to === '/'))
          ? 'text-blue-400'
          : 'text-slate-500 hover:text-slate-300'"
      >
        <span class="text-lg">{{ item.icon }}</span>
        <span>{{ item.label }}</span>
      </RouterLink>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
const $route = useRoute()

const navItems = [
  { to: '/', icon: '🏟️', label: 'Partidos' },
  { to: '/leaderboard', icon: '🏆', label: 'Tabla' },
  { to: '/profile', icon: '👤', label: 'Perfil' },
]
</script>
