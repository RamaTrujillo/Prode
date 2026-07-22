// Escudos de los clubes del Torneo Clausura.
//
// A diferencia del Mundial (banderas de países vía flagcdn), los clubes usan
// escudos propios. La URL del escudo se guarda en la fila del partido
// (matches.home_crest / away_crest) y la puebla la Edge Function desde el
// escudo que provee TheSportsDB. En partidos cargados a mano el escudo puede
// venir null, y en ese caso la UI muestra un placeholder con las iniciales.

// Normaliza la URL del escudo: devuelve la URL o null si no hay (carga manual).
export function getCrestUrl(crest: string | null | undefined): string | null {
  return crest && crest.trim() ? crest : null
}

// Iniciales del club para el placeholder cuando no hay escudo.
// "Boca Juniors" → "BJ", "River" → "RI", "Racing Club" → "RC".
export function getTeamInitials(teamName: string): string {
  const words = teamName.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}
