// Subset of football-data.org v4 response shapes that we consume. We don't
// declare the entire schema — just the fields used by import-fixture and
// sync-results. If the API adds a field we want, extend this here.

export type ApiMatchStatus =
  | 'SCHEDULED'
  | 'TIMED'
  | 'IN_PLAY'
  | 'PAUSED'
  | 'FINISHED'
  | 'POSTPONED'
  | 'SUSPENDED'
  | 'CANCELLED'

export type ApiStage =
  | 'GROUP_STAGE'
  | 'LAST_16'
  | 'QUARTER_FINALS'
  | 'SEMI_FINALS'
  | 'THIRD_PLACE'
  | 'FINAL'

export interface ApiTeam {
  id: number
  name: string
  shortName: string | null
  tla: string | null
  crest: string | null
}

export interface ApiScore {
  winner: 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null
  fullTime: { home: number | null; away: number | null }
  halfTime: { home: number | null; away: number | null }
}

export interface ApiMatch {
  id: number
  utcDate: string
  status: ApiMatchStatus
  stage: ApiStage
  homeTeam: ApiTeam
  awayTeam: ApiTeam
  score: ApiScore
}

export interface ApiMatchesResponse {
  count: number
  matches: ApiMatch[]
}
