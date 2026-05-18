import { onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useLeaderboardStore } from '@/stores/leaderboard.store'

export function useLeaderboard() {
  const store = useLeaderboardStore()
  const { entries, loading } = storeToRefs(store)

  onMounted(async () => {
    await store.fetchLeaderboard()
    store.subscribeToLeaderboard()
  })

  onUnmounted(() => {
    store.unsubscribe()
  })

  return { entries, loading }
}
