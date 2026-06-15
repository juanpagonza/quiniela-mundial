import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import type { ApiMatchesResponse, ApiMatchStatus, ApiStage, ApiTeam } from './types'
import { footballFetch } from './client'

type Client = SupabaseClient<Database>
type FasePartido = Database['public']['Enums']['fase_partido']
type EstadoPartido = Database['public']['Enums']['estado_partido']

// Mapping: football-data.org stage → our fase enum.
const STAGE_TO_FASE: Record<ApiStage, FasePartido> = {
  GROUP_STAGE: 'grupos',
  LAST_16: 'octavos',
  QUARTER_FINALS: 'cuartos',
  SEMI_FINALS: 'semis',
  THIRD_PLACE: 'tercer_puesto',
  FINAL: 'final',
}

// Mapping: football-data.org status → our estado enum. TIMED is treated as
// programado (same lifecycle, different precision). POSTPONED/SUSPENDED/CANCELLED
// all collapse to 'suspendido' because we don't need to distinguish them in UI.
// Exported so sync-results uses the same mapping — keeping a single source of truth.
export const STATUS_TO_ESTADO: Record<ApiMatchStatus, EstadoPartido> = {
  SCHEDULED: 'programado',
  TIMED: 'programado',
  IN_PLAY: 'en_curso',
  PAUSED: 'en_curso',
  FINISHED: 'finalizado',
  POSTPONED: 'suspendido',
  SUSPENDED: 'suspendido',
  CANCELLED: 'suspendido',
}

// FIFA TLA → flagcdn-compatible ISO-2 (lowercase). Only the codes where lowercasing
// the first two letters of TLA gives the wrong answer are listed here. Fallback is
// lowercase first 2 chars — works for ARG, BRA, FRA, etc., but breaks for ~30% of
// FIFA codes. Extend as new participants appear in real fixtures.
const TLA_TO_ISO2: Record<string, string> = {
  GER: 'de',
  ESP: 'es',
  USA: 'us',
  ENG: 'gb-eng',
  SCO: 'gb-sct',
  WAL: 'gb-wls',
  NIR: 'gb-nir',
  POR: 'pt',
  SUI: 'ch',
  NED: 'nl',
  DEN: 'dk',
  CRO: 'hr',
  SRB: 'rs',
  URU: 'uy',
  KOR: 'kr',
  JPN: 'jp',
  KSA: 'sa',
  UAE: 'ae',
  POL: 'pl',
  GHA: 'gh',
  SEN: 'sn',
  MAR: 'ma',
  TUN: 'tn',
  ALG: 'dz',
  CMR: 'cm',
  RSA: 'za',
  CRC: 'cr',
  ECU: 'ec',
  MEX: 'mx',
  CAN: 'ca',
  HON: 'hn',
  PAR: 'py',
  PER: 'pe',
  CHI: 'cl',
  IRN: 'ir',
  IRQ: 'iq',
  PHI: 'ph',
  // Added after observing wrong fallbacks in the live fixture (the bare
  // first-two-chars-of-TLA gave 'au' for Austria — colliding with Australia,
  // 'co' for Congo DR — colliding with Colombia, etc.). Keep these in sync
  // with the equipos.codigo_pais data fix.
  AUT: 'at',
  BIH: 'ba',
  CPV: 'cv',
  COD: 'cd',
  CUW: 'cw',
  HAI: 'ht',
  SWE: 'se',
  TUR: 'tr',
}

function tlaToIso2(tla: string | null): string {
  if (!tla) return 'xx'
  const upper = tla.toUpperCase()
  return TLA_TO_ISO2[upper] ?? upper.toLowerCase().slice(0, 2)
}

export interface ImportarFixtureResult {
  equipos_importados: number
  partidos_importados: number
  partidos_omitidos_tbd: number
}

interface EquipoRow {
  nombre: string
  codigo_pais: string
  api_id: number
}

interface PartidoRow {
  api_id: number
  equipo_local_id: string
  equipo_visitante_id: string
  fecha_hora_kickoff: string
  fase: FasePartido
  estado: EstadoPartido
}

/**
 * Pulls the fixture for `competitionId` (default 'WC' = FIFA World Cup) from
 * football-data.org and upserts equipos + partidos. Idempotent — relies on the
 * UNIQUE(api_id) constraint plus onConflict: 'api_id' so re-running just
 * refreshes metadata without duplicating rows.
 *
 * Does NOT touch marcador_*_real (sync-results owns scores) or
 * habilitado_para_predecir (admin owns visibility).
 */
export async function importarFixture(
  client: Client,
  competitionId: string = 'WC',
): Promise<ImportarFixtureResult> {
  const response = await footballFetch<ApiMatchesResponse>(
    `/competitions/${competitionId}/matches`,
  )

  // Dedup teams across matches (a team appears in many matches). Skip
  // placeholder TBD teams — those come as { id: null, name: null, ... }
  // for slots waiting on playoff results.
  const teamsByApiId = new Map<number, ApiTeam>()
  for (const match of response.matches) {
    if (isResolved(match.homeTeam)) {
      teamsByApiId.set(match.homeTeam.id, match.homeTeam)
    }
    if (isResolved(match.awayTeam)) {
      teamsByApiId.set(match.awayTeam.id, match.awayTeam)
    }
  }

  const equiposRows: EquipoRow[] = Array.from(teamsByApiId.values()).map((t) => ({
    // isResolved narrowed both id and name to non-null, so the assertions
    // here are safe (TS doesn't propagate the narrow through Map.values()).
    nombre: t.name!,
    codigo_pais: tlaToIso2(t.tla),
    api_id: t.id!,
  }))

  const { data: equipos, error: equiposError } = await client
    .from('equipos')
    .upsert(equiposRows, { onConflict: 'api_id' })
    .select('id, api_id')

  if (equiposError) {
    throw new Error(`Failed to upsert equipos: ${equiposError.message}`)
  }

  // Build api_id → equipos.id lookup so we can resolve FKs for partidos.
  const equipoIdByApiId = new Map<number, string>()
  for (const e of equipos ?? []) {
    equipoIdByApiId.set(e.api_id, e.id)
  }

  // Only import matches where BOTH teams are resolved. The skipped ones
  // (TBD slots) will get imported on a future re-run once football-data.org
  // fills in the playoff winners — the upsert is idempotent.
  let partidos_omitidos_tbd = 0
  const partidosRows: PartidoRow[] = []
  for (const m of response.matches) {
    const localId = m.homeTeam.id != null ? equipoIdByApiId.get(m.homeTeam.id) : undefined
    const visitId = m.awayTeam.id != null ? equipoIdByApiId.get(m.awayTeam.id) : undefined
    if (!localId || !visitId) {
      partidos_omitidos_tbd++
      continue
    }
    partidosRows.push({
      api_id: m.id,
      equipo_local_id: localId,
      equipo_visitante_id: visitId,
      fecha_hora_kickoff: m.utcDate,
      fase: STAGE_TO_FASE[m.stage],
      estado: STATUS_TO_ESTADO[m.status],
    })
  }

  const { error: partidosError } = await client
    .from('partidos')
    .upsert(partidosRows, { onConflict: 'api_id' })

  if (partidosError) {
    throw new Error(`Failed to upsert partidos: ${partidosError.message}`)
  }

  return {
    equipos_importados: equiposRows.length,
    partidos_importados: partidosRows.length,
    partidos_omitidos_tbd,
  }
}

/** True when the API gave us enough data to insert this team into equipos. */
function isResolved(t: ApiTeam): t is ApiTeam & { id: number; name: string } {
  return t.id != null && t.name != null && t.name.length > 0
}
