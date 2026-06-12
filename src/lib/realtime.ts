import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

type PostgresChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*'

// Fila genérica de Postgres tal como la entrega Realtime (igual que el default
// de supabase-js). Cada store castea payload.new a su tipo concreto.
type Row = Record<string, any>

interface SubscribeOptions {
  channel: string
  table: string
  event?: PostgresChangeEvent
  filter?: string
  onChange: (payload: RealtimePostgresChangesPayload<Row>) => void
}

// Helper de suscripción a cambios de una tabla por Realtime, pensado para usarse
// dentro de los stores (alcance de store, no de componente). Devuelve el canal
// para que el store lo guarde y luego lo libere con supabase.removeChannel().
export function subscribeToTable(opts: SubscribeOptions): RealtimeChannel {
  return supabase
    .channel(opts.channel)
    .on(
      'postgres_changes',
      {
        event: opts.event ?? '*',
        schema: 'public',
        table: opts.table,
        ...(opts.filter ? { filter: opts.filter } : {}),
      },
      opts.onChange,
    )
    .subscribe()
}
