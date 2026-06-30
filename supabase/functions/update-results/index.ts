import { createClient } from 'jsr:@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const FOOTBALL_API_KEY = Deno.env.get('FOOTBALL_API_KEY')!
const API_BASE = 'https://api.football-data.org/v4'

type MatchStage = 'group' | 'round_of_32' | 'round_of_16' | 'quarter' | 'semi' | 'third_place' | 'final'

interface ScoreDetail {
  home: number | null
  away: number | null
}

interface ApiMatch {
  id: number
  utcDate: string
  status: string
  stage: string
  group: string | null
  homeTeam: { name: string | null }
  awayTeam: { name: string | null }
  score: {
    duration:    string            // 'REGULAR' | 'EXTRA_TIME' | 'PENALTY_SHOOTOUT'
    fullTime:    ScoreDetail        // OJO: incluye los penales (regularTime + extraTime + tanda)
    regularTime: ScoreDetail | null // marcador a los 90'
    extraTime:   ScoreDetail | null // goles SOLO durante el alargue de 30' (no acumulado)
    penalties:   ScoreDetail | null // goles solo en la tanda (null si no hubo penales)
  }
}

const STAGE_MAP: Record<string, MatchStage> = {
  GROUP_STAGE:    'group',
  LAST_32:        'round_of_32',
  LAST_16:        'round_of_16',
  QUARTER_FINALS: 'quarter',
  SEMI_FINALS:    'semi',
  THIRD_PLACE:    'third_place',
  FINAL:          'final',
}

function mapStage(apiStage: string): MatchStage | null {
  return STAGE_MAP[apiStage] ?? null
}

function mapStatus(apiStatus: string): 'scheduled' | 'live' | 'finished' {
  if (apiStatus === 'FINISHED') return 'finished'
  if (['IN_PLAY', 'PAUSED', 'HALFTIME', 'EXTRA_TIME', 'PENALTY_SHOOTOUT'].includes(apiStatus)) return 'live'
  return 'scheduled'
}

function mapGroup(apiGroup: string | null): string | null {
  if (!apiGroup) return null
  const m = apiGroup.match(/GROUP_([A-Z])/)
  return m ? m[1] : null
}

// Devuelve el marcador que cuenta para el Prode: el resultado al final del
// partido EXCLUYENDO la tanda de penales (a los 90' o, si hubo, a los 120').
//
// Importante sobre football-data.org v4:
//  - `fullTime` trae el TOTAL incluyendo la tanda de penales
//    (p. ej. 1-1 + tanda 3-4 => fullTime 4-5). No sirve para penales.
//  - `regularTime` = marcador a los 90'.
//  - `extraTime`   = goles SOLO durante el alargue de 30' (no acumulado;
//    suele ser 0-0 en los partidos que terminan yendo a penales).
//  - El marcador real a los 120' = regularTime + extraTime.
//
// En partidos sin alargue, `regularTime` no viene y `fullTime` ya es correcto.
function finalScore(score: ApiMatch['score']): ScoreDetail {
  const reg = score.regularTime
  if (reg && reg.home !== null && reg.away !== null) {
    const et = score.extraTime
    return {
      home: reg.home + (et?.home ?? 0),
      away: reg.away + (et?.away ?? 0),
    }
  }
  return score.fullTime
}

const CRON_SECRET = Deno.env.get('CRON_SECRET')

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  if (CRON_SECRET) {
    const incoming = req.headers.get('x-cron-secret')
    if (incoming !== CRON_SECRET) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  if (!FOOTBALL_API_KEY) {
    return new Response(JSON.stringify({ error: 'FOOTBALL_API_KEY no configurado' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const res = await fetch(`${API_BASE}/competitions/WC/matches`, {
    headers: { 'X-Auth-Token': FOOTBALL_API_KEY },
  })

  if (!res.ok) {
    return new Response(
      JSON.stringify({ error: `football-data.org HTTP ${res.status}` }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const data = await res.json() as { matches: ApiMatch[] }

  const rows = data.matches
    .map((m) => {
      const stage = mapStage(m.stage)
      if (!stage || !m.homeTeam?.name || !m.awayTeam?.name) return null

      const score = finalScore(m.score)

      return {
        external_id: String(m.id),
        match_date:  m.utcDate,
        home_team:   m.homeTeam.name,
        away_team:   m.awayTeam.name,
        status:      mapStatus(m.status),
        stage,
        group_name:  mapGroup(m.group),
        home_score:  score.home,
        away_score:  score.away,
      }
    })
    .filter(Boolean)

  const { error, count } = await supabase
    .from('matches')
    .upsert(rows, { onConflict: 'external_id', count: 'exact' })

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ synced: count, total: rows.length }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
