<template>
  <div class="min-h-screen bg-slate-950 flex items-center justify-center p-4">
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <div class="text-5xl mb-3">⚽</div>
        <h1 class="text-2xl font-bold text-white">Prode Mundial 2026</h1>
        <p class="text-slate-400 mt-1 text-sm">Entrá para hacer tus predicciones</p>
      </div>

      <div class="bg-slate-900 rounded-2xl p-6 border border-slate-800 space-y-4">
        <form @submit.prevent="handleLogin" class="space-y-3">
          <div>
            <label class="block text-sm text-slate-400 mb-1">Email</label>
            <input
              v-model="email"
              type="email"
              required
              class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="tu@email.com"
            />
          </div>
          <div>
            <label class="block text-sm text-slate-400 mb-1">Contraseña</label>
            <input
              v-model="password"
              type="password"
              required
              minlength="6"
              class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          <p v-if="errorMsg" class="text-red-400 text-sm">{{ errorMsg }}</p>

          <button
            type="submit"
            :disabled="loading"
            class="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium py-2 rounded-lg transition-colors"
          >
            {{ loading ? 'Ingresando...' : 'Ingresar' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const { loading, signInWithEmail } = useAuth()

const email = ref('')
const password = ref('')
const errorMsg = ref('')

async function handleLogin() {
  errorMsg.value = ''
  try {
    await signInWithEmail(email.value, password.value)
    router.push('/')
  } catch (e: unknown) {
    errorMsg.value = e instanceof Error ? e.message : 'Email o contraseña incorrectos'
  }
}
</script>
