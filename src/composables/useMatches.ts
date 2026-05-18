import { onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useMatchesStore } from '@/stores/matches.store'

export function useMatches() {
  const store = useMatchesStore()
  const { matches, loading, upcomingMatches, liveMatches, finishedMatches, matchesByDate } =
    storeToRefs(store)

  onMounted(async () => {
    await store.fetchMatches()
    store.subscribeToMatchUpdates()
  })

  onUnmounted(() => {
    store.unsubscribe()
  })

  return {
    matches,
    loading,
    upcomingMatches,
    liveMatches,
    finishedMatches,
    matchesByDate,
    fetchMatchById: store.fetchMatchById,
  }
}
