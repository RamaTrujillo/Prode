import { createClient } from 'jsr:@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const FOOTBALL_API_KEY = Deno.env.get('FOOTBALL_API_KEY')!
const API_BASE = 'https://api.football-data.org/v4'

type MatchStage = 'group' | 'round_of_16' | 'quarter' | 'semi' | 'final'

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
    fullTime:  ScoreDetail
    extraTime: ScoreDetail | null  // goles al 120' (null si no hubo tiempo extra)
    penalties: ScoreDetail | null  // goles solo en la tanda (null si no hubo penales)
  }
}

const STAGE_MAP: Record<string, MatchStage> = {
  GROUP_STAGE:    'group',
  LAST_16:        'round_of_16',
  QUARTER_FINALS: 'quarter',
  SEMI_FINALS:    'semi',
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

// Devuelve el score definitivo del partido:
// - Si hubo tiempo extra: score al 120' (incluye goles en ET, excluye penales)
// - Si no: score a los 90'
function finalScore(score: ApiMatch['score']): ScoreDetail {
  const et = score.extraTime
  if (et && et.home !== null && et.away !== null) return et
  return score.fullTime
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
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
