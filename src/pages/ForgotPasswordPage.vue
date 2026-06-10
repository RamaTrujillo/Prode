<template>
  <div class="min-h-screen bg-slate-950 flex items-center justify-center p-4">
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <div class="text-5xl mb-3">⚽</div>
        <h1 class="text-2xl font-bold text-white">Recuperar contraseña</h1>
        <p class="text-slate-400 mt-1 text-sm">Te mandamos un mail con el link para reestablecerla</p>
      </div>

      <div class="bg-slate-900 rounded-2xl p-6 border border-slate-800 space-y-4">
        <div v-if="sent" class="text-center space-y-3">
          <p class="text-green-400 text-sm">
            Si el email está registrado, vas a recibir un link para crear una nueva contraseña.
            Revisá tu casilla (y el spam).
          </p>
          <router-link
            to="/login"
            class="inline-block text-blue-400 hover:text-blue-300 text-sm"
          >
            Volver al inicio
          </router-link>
        </div>

        <form v-else @submit.prevent="handleSubmit" class="space-y-3">
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

          <p v-if="errorMsg" class="text-red-400 text-sm">{{ errorMsg }}</p>

          <button
            type="submit"
            :disabled="loading"
            class="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium py-2 rounded-lg transition-colors"
          >
            {{ loading ? 'Enviando...' : 'Enviar link de recuperación' }}
          </button>

          <router-link
            to="/login"
            class="block text-center text-slate-400 hover:text-slate-300 text-sm pt-1"
          >
            Volver al inicio
          </router-link>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

const email = ref('')
const loading = ref(false)
const sent = ref(false)
const errorMsg = ref('')

async function handleSubmit() {
  errorMsg.value = ''
  loading.value = true
  try {
    const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}reset-password`
    const { error } = await supabase.auth.resetPasswordForEmail(email.value, { redirectTo })
    if (error) throw error
    sent.value = true
  } catch (e: unknown) {
    errorMsg.value = e instanceof Error ? e.message : 'No pudimos enviar el mail. Probá de nuevo.'
  } finally {
    loading.value = false
  }
}
</script>
