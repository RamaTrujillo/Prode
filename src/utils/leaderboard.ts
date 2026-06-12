import type { LeaderboardEntry } from '@/types'

// Puntaje del último puesto (menor total_pts). Devuelve null si están todos
// empatados o no hay entradas: en esos casos no hay "último" / burro.
export function lastPlacePts(entries: LeaderboardEntry[]): number | null {
  if (entries.length === 0) return null
  const pts = entries.map((e) => e.total_pts)
  const min = Math.min(...pts)
  const max = Math.max(...pts)
  return min === max ? null : min
}
