import { onMounted, onUnmounted } from 'vue'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

type PostgresChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*'

export function useRealtimeTable<T extends Record<string, unknown>>(
  table: string,
  callback: (payload: RealtimePostgresChangesPayload<T>) => void,
  event: PostgresChangeEvent = '*'
) {
  const channelName = `realtime:${table}:${event}`

  onMounted(() => {
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event, schema: 'public', table },
        callback as (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void
      )
      .subscribe()

    onUnmounted(() => {
      supabase.removeChannel(channel)
    })
  })
}
