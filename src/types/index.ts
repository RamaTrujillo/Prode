export type MatchStatus = 'scheduled' | 'live' | 'finished'
// Union de todas las fases posibles entre torneos. El Mundial usa 'round_of_32'
// y 'third_place'; el Clausura usa 'group' (zonas) + octavos → cuartos → semis →
// final. La app muestra un torneo a la vez, así que solo aparecen las fases que
// ese torneo realmente tiene.
export type MatchStage = 'group' | 'round_of_32' | 'round_of_16' | 'quarter' | 'semi' | 'third_place' | 'final'

export interface Tournament {
  id: number
  name: string
  slug: string
  season: number | null
  external_league_id: number | null
  round_filter: string | null
  group_label: string // término de la fase de grupos: 'Grupo' | 'Zona'
  is_active: boolean
}

export interface Match {
  id: string
  match_date: string
  home_team: string
  away_team: string
  home_score: number | null
  away_score: number | null
  status: MatchStatus
  stage: MatchStage
  group_name: string | null
  home_crest: string | null
  away_crest: string | null
  tournament_id: number | null
  external_id: string
  created_at: string
}

export interface Prediction {
  id: string
  user_id: string
  match_id: string
  home_score: number
  away_score: number
  points: number | null
  created_at: string
  updated_at: string
}

export interface UserProfile {
  id: string
  username: string
  total_pts: number
  created_at: string
}

export interface LeaderboardEntry {
  id: string
  username: string
  total_pts: number
  position: number
}

export interface PredictionWithMatch extends Prediction {
  match: Match
}
