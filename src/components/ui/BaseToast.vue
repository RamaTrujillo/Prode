<template>
  <Teleport to="body">
    <div class="fixed bottom-20 inset-x-4 z-[100] flex flex-col gap-2 pointer-events-none">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="mx-auto px-4 py-2 rounded-xl text-sm font-medium shadow-lg pointer-events-auto"
          :class="toastClasses(toast.type)"
        >
          {{ toast.message }}
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useToast, type ToastType } from '@/composables/useToast'

const { toasts } = useToast()

function toastClasses(type: ToastType) {
  const map: Record<ToastType, string> = {
    success: 'bg-green-900 text-green-200 border border-green-700',
    error: 'bg-red-900 text-red-200 border border-red-700',
    info: 'bg-slate-800 text-slate-200 border border-slate-700',
  }
  return map[type]
}
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
