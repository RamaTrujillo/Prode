<template>
  <template v-if="isLoginPage">
    <RouterView />
  </template>
  <template v-else>
    <AppHeader />
    <main class="max-w-2xl mx-auto px-4 pt-4 pb-24">
      <RouterView />
    </main>
    <AppNav />
    <BaseToast />
  </template>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { usePredictionsStore } from '@/stores/predictions.store'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppNav from '@/components/layout/AppNav.vue'
import BaseToast from '@/components/ui/BaseToast.vue'

const route = useRoute()
const authStore = useAuthStore()
const predictionsStore = usePredictionsStore()

const isLoginPage = computed(() => route.name === 'login')

onMounted(async () => {
  await authStore.initialize()
  if (authStore.isAuthenticated) {
    await predictionsStore.fetchUserPredictions()
  }
})
</script>
