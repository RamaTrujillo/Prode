import { createClient } from 'jsr:@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// TheSportsDB: la API key va en el path. '3' es la key de prueba (datos reales,
// pero puede venir limitada); conviene poner una key propia gratuita vía secret.
const TSDB_KEY = Deno.env.get('THESPORTSDB_KEY') ?? '3'
const API_BASE = `https://www.thesportsdb.com/api/v1/json/${TSDB_KEY}`

type MatchStage = 'group' | 'round_of_16' | 'quarter' | 'semi' | 'final'

// ── TheSportsDB: shapes ──────────────────────────────────────────────────────
interface TsdbEvent {
  idEvent: string
  strEvent: string | null
  strHomeTeam: string | null
  strAwayTeam: string | null
  intHomeScore: string | null
  intAwayScore: string | null
  strStatus: string | null
  strStage: string | null
  dateEvent: string | null        // 'YYYY-MM-DD'
  strTimestamp: string | null     // 'YYYY-MM-DDTHH:mm:ss' (UTC)
  strHomeTeamBadge: string | null
  strAwayTeamBadge: string | null
}

interface TsdbStanding {
  strTeam: string | null
  strBadge: string | null
  strGroup: string | null         // p. ej. 'Clausura - Group A'
}

interface TeamInfo {
  zone: string | null
  badge: string | null
}

// ── Mapeos ───────────────────────────────────────────────────────────────────

// Fase a partir de pistas de texto (strStage / nombre del evento). En la fase
// regular no hay indicios → 'group'. Cubre variantes inglés/español de playoffs.
function mapStage(ev: TsdbEvent): MatchStage {
  const s = `${ev.strStage ?? ''} ${ev.strEvent ?? ''}`.toLowerCase()
  if (/\bfinal\b/.test(s) && !/semi|quarter|cuarto/.test(s)) return 'final'
  if (/semi/.test(s)) return 'semi'
  if (/quarter|cuarto/.test(s)) return 'quarter'
  if (/round of 16|octavo|8th/.test(s)) return 'round_of_16'
  return 'group'
}

function mapStatus(status: string | null): 'scheduled' | 'live' | 'finished' {
  const s = (status ?? '').toUpperCase()
  if (['FT', 'AET', 'PEN', 'MATCH FINISHED'].includes(s)) return 'finished'
  if (['1H', '2H', 'HT', 'ET', 'BT', 'P', 'LIVE'].includes(s)) return 'live'
  return 'scheduled' // NS, NOT STARTED, PST, POSTPONED, CANCELLED, '', ...
}

// Zona ('A'/'B') a partir del strGroup de las posiciones ('Clausura - Group A').
function parseZone(group: string | null): string | null {
  if (!group) return null
  const m = group.match(/group\s*([AB])/i) ?? group.match(/zona\s*([AB])/i) ?? group.match(/\b([AB])\b/i)
  return m ? m[1].toUpperCase() : null
}

// Normaliza el timestamp a UTC explícito para la columna timestamptz.
function toMatchDate(ev: TsdbEvent): string | null {
  const ts = ev.strTimestamp
  if (ts) return /[Z]|[+-]\d\d:?\d\d$/.test(ts) ? ts : `${ts}Z`
  return ev.dateEvent // solo fecha, sin hora
}

async function fetchEvents(url: string): Promise<TsdbEvent[]> {
  try {
    const res = await fetch(url)
    if (!res.ok) return []
    const data = await res.json() as { events: TsdbEvent[] | null }
    return data.events ?? []
  } catch (_) {
    return []
  }
}

// Mapa team → { zona, escudo } desde /lookuptable. Best-effort: si aún no hay
// tabla del Clausura (recién arranca) devuelve un mapa vacío y la fase regular
// queda sin zona hasta que la API la publique.
async function fetchTeamInfo(leagueId: number, season: number, roundFilter: string | null): Promise<Map<string, TeamInfo>> {
  const map = new Map<string, TeamInfo>()
  try {
    const res = await fetch(`${API_BASE}/lookuptable.php?l=${leagueId}&s=${season}`)
    if (!res.ok) return map
    const data = await res.json() as { table: TsdbStanding[] | null }
    for (const row of data.table ?? []) {
      // Dentro de la misma temporada conviven Apertura y Clausura; nos quedamos
      // con las filas del torneo (strGroup contiene, p. ej., 'Clausura').
      if (roundFilter && !(row.strGroup ?? '').toLowerCase().includes(roundFilter.toLowerCase())) continue
      if (row.strTeam) map.set(row.strTeam, { zone: parseZone(row.strGroup), badge: row.strBadge })
    }
  } catch (_) {
    // best-effort
  }
  return map
}

const CRON_SECRET = Deno.env.get('CRON_SECRET')

function jsonError(message: string, status: number, extra?: Record<string, unknown>) {
  return new Response(
    JSON.stringify({ error: message, ...extra }),
    { status, headers: { 'Content-Type': 'application/json' } }
  )
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  if (CRON_SECRET) {
    const incoming = req.headers.get('x-cron-secret')
    if (incoming !== CRON_SECRET) return jsonError('Unauthorized', 401)
  }

  // Torneo a sincronizar: el activo que tenga liga externa (el Mundial no tiene).
  const { data: tournament, error: tErr } = await supabase
    .from('tournaments')
    .select('id, external_league_id, season, round_filter, starts_on')
    .eq('is_active', true)
    .not('external_league_id', 'is', null)
    .maybeSingle()

  if (tErr) return jsonError(tErr.message, 500)
  if (!tournament) return jsonError('No hay torneo activo con external_league_id configurado', 400)

  const leagueId = tournament.external_league_id as number
  const season = tournament.season as number
  const roundFilter = tournament.round_filter as string | null
  const startsOn = tournament.starts_on as string | null // 'YYYY-MM-DD'

  // Próximos + pasados (endpoints "en vivo", siempre frescos) y, si está
  // disponible en el plan, la temporada completa. Se mergean por idEvent.
  const [next, past, seasonEvents] = await Promise.all([
    fetchEvents(`${API_BASE}/eventsnextleague.php?id=${leagueId}`),
    fetchEvents(`${API_BASE}/eventspastleague.php?id=${leagueId}`),
    fetchEvents(`${API_BASE}/eventsseason.php?id=${leagueId}&s=${season}`),
  ])

  const byId = new Map<string, TsdbEvent>()
  // Orden: primero temporada, luego past/next (más frescos pisan a la temporada).
  for (const ev of [...seasonEvents, ...past, ...next]) {
    if (ev?.idEvent) byId.set(ev.idEvent, ev)
  }

  const teamInfo = await fetchTeamInfo(leagueId, season, roundFilter)

  const rows = [...byId.values()]
    .filter((ev) => {
      if (!ev.strHomeTeam || !ev.strAwayTeam) return false
      // Descartar lo anterior al arranque del torneo (p. ej. el Apertura).
      if (startsOn && ev.dateEvent && ev.dateEvent < startsOn) return false
      return true
    })
    .map((ev) => {
      const stage = mapStage(ev)
      const homeInfo = teamInfo.get(ev.strHomeTeam!)
      const awayInfo = teamInfo.get(ev.strAwayTeam!)
      const toScore = (v: string | null) => (v === null || v === '' ? null : Number(v))

      return {
        external_id:   ev.idEvent,
        tournament_id: tournament.id,
        match_date:    toMatchDate(ev),
        home_team:     ev.strHomeTeam,
        away_team:     ev.strAwayTeam,
        home_crest:    ev.strHomeTeamBadge ?? homeInfo?.badge ?? null,
        away_crest:    ev.strAwayTeamBadge ?? awayInfo?.badge ?? null,
        status:        mapStatus(ev.strStatus),
        stage,
        group_name:    stage === 'group' ? (homeInfo?.zone ?? null) : null,
        home_score:    toScore(ev.intHomeScore),
        away_score:    toScore(ev.intAwayScore),
      }
    })
    .filter((r) => r.match_date) // sin fecha no se puede programar

  if (rows.length === 0) {
    return new Response(
      JSON.stringify({ synced: 0, total: 0, note: 'Sin eventos del torneo (¿API limitada o torneo sin fixture aún?)' }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  }

  const { error, count } = await supabase
    .from('matches')
    .upsert(rows, { onConflict: 'external_id', count: 'exact' })

  if (error) return jsonError(error.message, 500)

  return new Response(
    JSON.stringify({ synced: count, total: rows.length }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
