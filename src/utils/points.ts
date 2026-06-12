// Colores según el puntaje de una predicción:
// 3 = resultado exacto · 1 = acierta el ganador/empate · 0 = erró · null = aún sin calcular.

export function pointsBadgeClasses(points: number | null): string {
  if (points === null) return 'bg-slate-800 text-slate-400'
  if (points === 3) return 'bg-green-950 text-green-400'
  if (points === 1) return 'bg-yellow-950 text-yellow-400'
  return 'bg-red-950 text-red-400'
}

export function pointsTextClasses(points: number | null): string {
  if (points === 3) return 'text-green-400'
  if (points === 1) return 'text-yellow-400'
  return 'text-red-400'
}

// Etiqueta corta del puntaje: "+3" / "+1" / "0" · "?" si aún no se calculó.
export function pointsLabel(points: number | null): string {
  if (points === null) return '?'
  if (points <= 0) return '0'
  return `+${points}`
}

// Unidad: "pt" si es exactamente 1, "pts" en cualquier otro caso.
export function ptsUnit(points: number | null): string {
  return points === 1 ? 'pt' : 'pts'
}
