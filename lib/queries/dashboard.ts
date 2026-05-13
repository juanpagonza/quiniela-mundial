import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, EstadoPartido, FasePartido } from '@/lib/supabase/types'
import type { EquipoMini, PrediccionMini } from './partidos'

type Client = SupabaseClient<Database>

export interface ProximoPartido {
  id: string
  fase: FasePartido
  estado: EstadoPartido
  fecha_hora_kickoff: string
  habilitado_para_predecir: boolean
  equipo_local: EquipoMini
  equipo_visitante: EquipoMini
  mi_prediccion: PrediccionMini | null
}

export interface LeaderboardRow {
  usuario_id: string
  nombre: string
  foto_url: string | null
  puntos: number
}

/**
 * Returns the next match whose kickoff is in the future. Null when the
 * fixture is empty or every match has started. Includes the caller's
 * prediction if they made one.
 */
export async function obtenerProximoPartido(
  supabase: Client,
  userId: string,
): Promise<ProximoPartido | null> {
  const ahora = new Date().toISOString()

  const { data: partido, error: partidoError } = await supabase
    .from('partidos')
    .select(
      `id, fase, estado, fecha_hora_kickoff, habilitado_para_predecir,
       equipo_local:equipos!equipo_local_id (id, nombre, codigo_pais),
       equipo_visitante:equipos!equipo_visitante_id (id, nombre, codigo_pais)`,
    )
    .gt('fecha_hora_kickoff', ahora)
    .order('fecha_hora_kickoff', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (partidoError) throw partidoError
  if (!partido) return null

  const { data: pred, error: predError } = await supabase
    .from('predicciones_partido')
    .select('marcador_local, marcador_visitante, puntos_obtenidos')
    .eq('usuario_id', userId)
    .eq('partido_id', partido.id)
    .maybeSingle()

  if (predError) throw predError

  return {
    id: partido.id,
    fase: partido.fase,
    estado: partido.estado,
    fecha_hora_kickoff: partido.fecha_hora_kickoff,
    habilitado_para_predecir: partido.habilitado_para_predecir,
    equipo_local: partido.equipo_local as unknown as EquipoMini,
    equipo_visitante: partido.equipo_visitante as unknown as EquipoMini,
    mi_prediccion: pred,
  }
}

/**
 * Top-N leaderboard computed in JS by summing puntos from all three
 * prediction tables per user. Until Fase 5 ships the SQL view this is
 * the source of truth; it stays correct after the view lands because
 * the math is identical — only the cost shifts.
 *
 * For 15 users + ~64 matches it's a single round-trip in the low kB.
 */
export async function obtenerLeaderboard(
  supabase: Client,
  limit = 5,
): Promise<LeaderboardRow[]> {
  const { data, error } = await supabase.from('usuarios').select(
    `id, nombre, foto_url,
     predicciones_partido (puntos_obtenidos),
     predicciones_bonus (puntos_obtenidos),
     predicciones_torneo (puntos_campeon, puntos_subcampeon, puntos_goleador)`,
  )

  if (error) throw error
  if (!data) return []

  const rows: LeaderboardRow[] = data.map((u) => {
    const partido = (u.predicciones_partido ?? []).reduce(
      (s, p) => s + (p.puntos_obtenidos ?? 0),
      0,
    )
    const bonus = (u.predicciones_bonus ?? []).reduce(
      (s, p) => s + (p.puntos_obtenidos ?? 0),
      0,
    )
    // predicciones_torneo is 1:1 with usuario via UNIQUE constraint, but
    // the relationship returns an array shape from PostgREST.
    const torneoArr = Array.isArray(u.predicciones_torneo)
      ? u.predicciones_torneo
      : u.predicciones_torneo
        ? [u.predicciones_torneo]
        : []
    const torneo = torneoArr.reduce(
      (s, t) =>
        s +
        (t.puntos_campeon ?? 0) +
        (t.puntos_subcampeon ?? 0) +
        (t.puntos_goleador ?? 0),
      0,
    )
    return {
      usuario_id: u.id,
      nombre: u.nombre,
      foto_url: u.foto_url,
      puntos: partido + bonus + torneo,
    }
  })

  rows.sort((a, b) => {
    if (b.puntos !== a.puntos) return b.puntos - a.puntos
    return a.nombre.localeCompare(b.nombre)
  })

  return rows.slice(0, limit)
}

/**
 * Number of open future matches the user hasn't yet predicted. "Open"
 * means habilitado_para_predecir AND kickoff in the future. Used in the
 * dashboard pending-bets pill.
 */
export async function contarPrediccionesPendientes(
  supabase: Client,
  userId: string,
): Promise<number> {
  const ahora = new Date().toISOString()

  const { data: abiertos, error: abiertosError } = await supabase
    .from('partidos')
    .select('id')
    .gt('fecha_hora_kickoff', ahora)
    .eq('habilitado_para_predecir', true)

  if (abiertosError) throw abiertosError
  if (!abiertos || abiertos.length === 0) return 0

  const ids = abiertos.map((p) => p.id)
  const { data: predichos, error: predError } = await supabase
    .from('predicciones_partido')
    .select('partido_id')
    .eq('usuario_id', userId)
    .in('partido_id', ids)

  if (predError) throw predError

  const predichosSet = new Set((predichos ?? []).map((p) => p.partido_id))
  return abiertos.filter((p) => !predichosSet.has(p.id)).length
}
