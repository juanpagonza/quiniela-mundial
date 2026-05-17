import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Database,
  EstadoPartido,
  FasePartido,
} from '@/lib/supabase/types'
import type { EquipoMini } from './partidos'

type Client = SupabaseClient<Database>

export interface MiPrediccionEnPerfil {
  partido_id: string
  fecha_hora_kickoff: string
  fase: FasePartido
  estado: EstadoPartido
  marcador_local_real: number | null
  marcador_visitante_real: number | null
  equipo_local: EquipoMini
  equipo_visitante: EquipoMini
  mi_marcador_local: number
  mi_marcador_visitante: number
  puntos_obtenidos: number
}

export interface MiPrediccionTorneo {
  campeon: EquipoMini | null
  subcampeon: EquipoMini | null
  goleador_nombre: string | null
  puntos_campeon: number
  puntos_subcampeon: number
  puntos_goleador: number
}

export interface PerfilUsuario {
  puntos_totales: number
  marcadores_exactos: number
  total_predicciones: number
  aciertos: number
  predicciones: MiPrediccionEnPerfil[]
  torneo: MiPrediccionTorneo | null
  mundial_iniciado: boolean
}

/**
 * Builds the per-user breakdown for /perfil. Combines:
 * - The user's row in the leaderboard view (puntos, exactos).
 * - Their full predicciones_partido list joined with partidos + equipos so
 *   the page can group by fase and show real vs predicted.
 * - Their predicciones_torneo (1:1) joined with the picked equipos.
 * - mundial_iniciado() RPC to decide whether torneo picks are visible.
 *
 * All in parallel — the heaviest is the predicciones join, which for 15
 * users × 64 matches stays tiny.
 */
export async function obtenerPerfilUsuario(
  supabase: Client,
  userId: string,
): Promise<PerfilUsuario> {
  const [
    leaderboardRow,
    misPredicciones,
    miTorneo,
    iniciado,
  ] = await Promise.all([
    supabase
      .from('leaderboard')
      .select('puntos_totales, marcadores_exactos')
      .eq('usuario_id', userId)
      .maybeSingle(),
    supabase
      .from('predicciones_partido')
      .select(
        `marcador_local, marcador_visitante, puntos_obtenidos,
         partido:partidos!partido_id (
           id, fase, estado, fecha_hora_kickoff,
           marcador_local_real, marcador_visitante_real,
           equipo_local:equipos!equipo_local_id (id, nombre, codigo_pais),
           equipo_visitante:equipos!equipo_visitante_id (id, nombre, codigo_pais)
         )`,
      )
      .eq('usuario_id', userId),
    supabase
      .from('predicciones_torneo')
      .select(
        `campeon_equipo_id, subcampeon_equipo_id, goleador_nombre,
         puntos_campeon, puntos_subcampeon, puntos_goleador,
         campeon:equipos!campeon_equipo_id (id, nombre, codigo_pais),
         subcampeon:equipos!subcampeon_equipo_id (id, nombre, codigo_pais)`,
      )
      .eq('usuario_id', userId)
      .maybeSingle(),
    supabase.rpc('mundial_iniciado'),
  ])

  if (leaderboardRow.error) throw leaderboardRow.error
  if (misPredicciones.error) throw misPredicciones.error
  if (miTorneo.error) throw miTorneo.error
  if (iniciado.error) throw iniciado.error

  const predicciones: MiPrediccionEnPerfil[] = (misPredicciones.data ?? [])
    .map((row) => {
      const partido = row.partido as unknown as {
        id: string
        fase: FasePartido
        estado: EstadoPartido
        fecha_hora_kickoff: string
        marcador_local_real: number | null
        marcador_visitante_real: number | null
        equipo_local: EquipoMini
        equipo_visitante: EquipoMini
      } | null
      if (!partido) return null
      return {
        partido_id: partido.id,
        fecha_hora_kickoff: partido.fecha_hora_kickoff,
        fase: partido.fase,
        estado: partido.estado,
        marcador_local_real: partido.marcador_local_real,
        marcador_visitante_real: partido.marcador_visitante_real,
        equipo_local: partido.equipo_local,
        equipo_visitante: partido.equipo_visitante,
        mi_marcador_local: row.marcador_local,
        mi_marcador_visitante: row.marcador_visitante,
        puntos_obtenidos: row.puntos_obtenidos,
      } satisfies MiPrediccionEnPerfil
    })
    .filter((p): p is MiPrediccionEnPerfil => p !== null)
    .sort(
      (a, b) =>
        new Date(a.fecha_hora_kickoff).getTime() -
        new Date(b.fecha_hora_kickoff).getTime(),
    )

  const torneo: MiPrediccionTorneo | null = miTorneo.data
    ? {
        campeon: miTorneo.data.campeon as unknown as EquipoMini | null,
        subcampeon: miTorneo.data.subcampeon as unknown as EquipoMini | null,
        goleador_nombre: miTorneo.data.goleador_nombre,
        puntos_campeon: miTorneo.data.puntos_campeon,
        puntos_subcampeon: miTorneo.data.puntos_subcampeon,
        puntos_goleador: miTorneo.data.puntos_goleador,
      }
    : null

  const aciertos = predicciones.filter((p) => p.puntos_obtenidos > 0).length

  return {
    puntos_totales: leaderboardRow.data?.puntos_totales ?? 0,
    marcadores_exactos: leaderboardRow.data?.marcadores_exactos ?? 0,
    total_predicciones: predicciones.length,
    aciertos,
    predicciones,
    torneo,
    mundial_iniciado: Boolean(iniciado.data),
  }
}
