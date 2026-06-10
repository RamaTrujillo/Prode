<template>
  <div class="min-h-screen bg-slate-950 flex items-center justify-center p-4">
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <div class="text-5xl mb-3">⚽</div>
        <h1 class="text-2xl font-bold text-white">Nueva contraseña</h1>
        <p class="text-slate-400 mt-1 text-sm">Elegí una contraseña nueva para tu cuenta</p>
      </div>

      <div class="bg-slate-900 rounded-2xl p-6 border border-slate-800 space-y-4">
        <p v-if="!ready" class="text-slate-400 text-sm text-center">
          Verificando el link...
        </p>

        <div v-else-if="invalidLink" class="text-center space-y-3">
          <p class="text-red-400 text-sm">
            El link no es válido o ya expiró. Pedí uno nuevo desde "Recuperar contraseña".
          </p>
          <router-link
            to="/forgot-password"
            class="inline-block text-blue-400 hover:text-blue-300 text-sm"
          >
            Pedir otro link
          </router-link>
        </div>

        <form v-else @submit.prevent="handleSubmit" class="space-y-3">
          <div>
            <label class="block text-sm text-slate-400 mb-1">Nueva contraseña</label>
            <input
              v-model="newPassword"
              type="password"
              required
              minlength="6"
              placeholder="Mínimo 6 caracteres"
              class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label class="block text-sm text-slate-400 mb-1">Confirmar contraseña</label>
            <input
              v-model="confirmPassword"
              type="password"
              required
              minlength="6"
              placeholder="Repetí la nueva contraseña"
              class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <p v-if="errorMsg" class="text-red-400 text-sm">{{ errorMsg }}</p>

          <button
            type="submit"
            :disabled="saving"
            class="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium py-2 rounded-lg transition-colors"
          >
            {{ saving ? 'Guardando...' : 'Guardar contraseña' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const { success: toastSuccess, error: toastError } = useToast()

const newPassword = ref('')
const confirmPassword = ref('')
const saving = ref(false)
const errorMsg = ref('')
const ready = ref(false)
const invalidLink = ref(false)

let unsubscribe: (() => void) | null = null

onMounted(async () => {
  // Al abrir el link del mail, Supabase emite PASSWORD_RECOVERY y crea una
  // sesión temporal. Escuchamos el evento para habilitar el formulario.
  const { data } = supabase.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') {
      invalidLink.value = false
      ready.value = true
    }
  })
  unsubscribe = () => data.subscription.unsubscribe()

  // Si la sesión ya quedó establecida (recarga, evento previo), habilitamos.
  const { data: { session } } = await supabase.auth.getSession()
  if (session) {
    ready.value = true
  } else {
    // Damos un margen al evento PASSWORD_RECOVERY; si no llega, el link no sirve.
    setTimeout(() => {
      if (!ready.value) invalidLink.value = true
      ready.value = true
    }, 2500)
  }
})

onUnmounted(() => unsubscribe?.())

async function handleSubmit() {
  errorMsg.value = ''
  if (newPassword.value !== confirmPassword.value) {
    errorMsg.value = 'Las contraseñas no coinciden'
    return
  }
  saving.value = true
  try {
    const { error } = await supabase.auth.updateUser({ password: newPassword.value })
    if (error) throw error
    toastSuccess('Contraseña actualizada. Ingresá con tu nueva contraseña.')
    await supabase.auth.signOut()
    router.push('/login')
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'No pudimos cambiar la contraseña.'
    errorMsg.value = msg
    toastError(msg)
  } finally {
    saving.value = false
  }
}
</script>
