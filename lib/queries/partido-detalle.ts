import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, EstadoPartido, FasePartido } from '@/lib/supabase/types'
import type { EquipoMini } from './partidos'

type Client = SupabaseClient<Database>

export interface PrediccionUsuario {
  usuario_id: string
  nombre: string
  foto_url: string | null
  marcador_local: number
  marcador_visitante: number
  puntos_obtenidos: number
}

export interface PartidoDetalle {
  id: string
  fase: FasePartido
  estado: EstadoPartido
  fecha_hora_kickoff: string
  marcador_local_real: number | null
  marcador_visitante_real: number | null
  habilitado_para_predecir: boolean
  equipo_local: EquipoMini
  equipo_visitante: EquipoMini
  /** Caller's own prediction, or null if they haven't predicted yet. */
  mi_prediccion: PrediccionUsuario | null
  /**
   * Every prediction visible to the caller. Pre-kickoff, RLS returns only
   * the caller's own row (so this array is at most length 1 and equals
   * `mi_prediccion`). Post-kickoff, RLS opens up and we get the full group.
   */
  todas_predicciones: PrediccionUsuario[]
}

/**
 * Returns null when the partido doesn't exist (or RLS hides it). The detail
 * page maps that to notFound().
 */
export async function obtenerPartidoDetalle(
  supabase: Client,
  partidoId: string,
  userId: string,
): Promise<PartidoDetalle | null> {
  const [partidoResult, prediccionesResult] = await Promise.all([
    supabase
      .from('partidos')
      .select(
        `id, fase, estado, fecha_hora_kickoff,
         marcador_local_real, marcador_visitante_real, habilitado_para_predecir,
         equipo_local:equipos!equipo_local_id (id, nombre, codigo_pais),
         equipo_visitante:equipos!equipo_visitante_id (id, nombre, codigo_pais)`,
      )
      .eq('id', partidoId)
      .maybeSingle(),
    supabase
      .from('predicciones_partido')
      .select(
        `usuario_id, marcador_local, marcador_visitante, puntos_obtenidos,
         usuario:usuarios!usuario_id (nombre, foto_url)`,
      )
      .eq('partido_id', partidoId),
  ])

  if (partidoResult.error) throw partidoResult.error
  if (prediccionesResult.error) throw prediccionesResult.error
  if (!partidoResult.data) return null

  const todas: PrediccionUsuario[] = (prediccionesResult.data ?? []).map(
    (row) => {
      const usuario = row.usuario as unknown as { nombre: string; foto_url: string | null }
      return {
        usuario_id: row.usuario_id,
        nombre: usuario?.nombre ?? 'Usuario',
        foto_url: usuario?.foto_url ?? null,
        marcador_local: row.marcador_local,
        marcador_visitante: row.marcador_visitante,
        puntos_obtenidos: row.puntos_obtenidos,
      }
    },
  )

  const mi = todas.find((p) => p.usuario_id === userId) ?? null

  const partidoRow = partidoResult.data
  return {
    id: partidoRow.id,
    fase: partidoRow.fase,
    estado: partidoRow.estado,
    fecha_hora_kickoff: partidoRow.fecha_hora_kickoff,
    marcador_local_real: partidoRow.marcador_local_real,
    marcador_visitante_real: partidoRow.marcador_visitante_real,
    habilitado_para_predecir: partidoRow.habilitado_para_predecir,
    equipo_local: partidoRow.equipo_local as unknown as EquipoMini,
    equipo_visitante: partidoRow.equipo_visitante as unknown as EquipoMini,
    mi_prediccion: mi,
    todas_predicciones: todas,
  }
}
