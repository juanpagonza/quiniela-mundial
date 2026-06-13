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
  count_preguntas_bonus: number
}

export interface LeaderboardRow {
  usuario_id: string
  nombre: string
  foto_url: string | null
  puntos: number
  marcadores_exactos: number
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

  const [predResult, bonusResult] = await Promise.all([
    supabase
      .from('predicciones_partido')
      .select('marcador_local, marcador_visitante, puntos_obtenidos')
      .eq('usuario_id', userId)
      .eq('partido_id', partido.id)
      .maybeSingle(),
    supabase
      .from('preguntas_bonus')
      .select('id', { count: 'exact', head: true })
      .eq('partido_id', partido.id),
  ])

  if (predResult.error) throw predResult.error
  if (bonusResult.error) throw bonusResult.error

  return {
    id: partido.id,
    fase: partido.fase,
    estado: partido.estado,
    fecha_hora_kickoff: partido.fecha_hora_kickoff,
    habilitado_para_predecir: partido.habilitado_para_predecir,
    equipo_local: partido.equipo_local as unknown as EquipoMini,
    equipo_visitante: partido.equipo_visitante as unknown as EquipoMini,
    mi_prediccion: predResult.data,
    count_preguntas_bonus: bonusResult.count ?? 0,
  }
}

/**
 * Reads the leaderboard view (created in Fase 5.3). The view already does
 * the sum across predicciones_partido + predicciones_bonus + predicciones_torneo
 * with correlated subqueries (no cardinality bug), and applies the ORDER BY
 * we want: puntos desc, exactos desc, nombre asc.
 *
 * The view's columns are typed nullable (PostgREST can't infer NOT NULL on
 * aggregate expressions), but every row in practice has values — we coalesce
 * just to satisfy the type system. `limit` is optional; omit it for the full
 * tabla.
 */
export async function obtenerLeaderboard(
  supabase: Client,
  limit?: number,
): Promise<LeaderboardRow[]> {
  const query = supabase
    .from('leaderboard')
    .select('usuario_id, nombre, foto_url, puntos_totales, marcadores_exactos')
  const { data, error } = limit ? await query.limit(limit) : await query

  if (error) throw error

  return (data ?? []).map((r) => ({
    usuario_id: r.usuario_id ?? '',
    nombre: r.nombre ?? '',
    foto_url: r.foto_url,
    puntos: r.puntos_totales ?? 0,
    marcadores_exactos: r.marcadores_exactos ?? 0,
  }))
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
