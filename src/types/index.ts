export type MatchStatus = 'scheduled' | 'live' | 'finished'
export type MatchStage = 'group' | 'round_of_16' | 'quarter' | 'semi' | 'final'

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
