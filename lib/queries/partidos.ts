import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, EstadoPartido, FasePartido } from '@/lib/supabase/types'

type Client = SupabaseClient<Database>

export interface EquipoMini {
  id: string
  nombre: string
  codigo_pais: string
}

export interface PrediccionMini {
  marcador_local: number
  marcador_visitante: number
  puntos_obtenidos: number
}

export interface PartidoConPrediccion {
  id: string
  fase: FasePartido
  estado: EstadoPartido
  fecha_hora_kickoff: string
  marcador_local_real: number | null
  marcador_visitante_real: number | null
  habilitado_para_predecir: boolean
  equipo_local: EquipoMini
  equipo_visitante: EquipoMini
  mi_prediccion: PrediccionMini | null
  count_preguntas_bonus: number
}

/**
 * Fetches the full fixture (oldest → newest) with the requesting user's
 * predictions merged in. Three parallel queries because supabase-js nested
 * selects with relationship filters get awkward; a JS-side merge against
 * Maps keeps the queries readable and the network cost roughly equivalent
 * for ~64 matches. The third query just counts bonus questions per partido
 * so the card can surface an "includes bonus" badge.
 */
export async function obtenerPartidosConPrediccion(
  supabase: Client,
  userId: string,
): Promise<PartidoConPrediccion[]> {
  const [partidosResult, prediccionesResult, preguntasBonusResult] =
    await Promise.all([
      supabase
        .from('partidos')
        .select(
          `id, fase, estado, fecha_hora_kickoff,
           marcador_local_real, marcador_visitante_real, habilitado_para_predecir,
           equipo_local:equipos!equipo_local_id (id, nombre, codigo_pais),
           equipo_visitante:equipos!equipo_visitante_id (id, nombre, codigo_pais)`,
        )
        .order('fecha_hora_kickoff', { ascending: true }),
      supabase
        .from('predicciones_partido')
        .select('partido_id, marcador_local, marcador_visitante, puntos_obtenidos')
        .eq('usuario_id', userId),
      supabase.from('preguntas_bonus').select('partido_id'),
    ])

  if (partidosResult.error) throw partidosResult.error
  if (prediccionesResult.error) throw prediccionesResult.error
  if (preguntasBonusResult.error) throw preguntasBonusResult.error

  const predByPartido = new Map<string, PrediccionMini>()
  for (const p of prediccionesResult.data ?? []) {
    predByPartido.set(p.partido_id, {
      marcador_local: p.marcador_local,
      marcador_visitante: p.marcador_visitante,
      puntos_obtenidos: p.puntos_obtenidos,
    })
  }

  const bonusCountByPartido = new Map<string, number>()
  for (const pb of preguntasBonusResult.data ?? []) {
    bonusCountByPartido.set(
      pb.partido_id,
      (bonusCountByPartido.get(pb.partido_id) ?? 0) + 1,
    )
  }

  return (partidosResult.data ?? []).map((p) => ({
    id: p.id,
    fase: p.fase,
    estado: p.estado,
    fecha_hora_kickoff: p.fecha_hora_kickoff,
    marcador_local_real: p.marcador_local_real,
    marcador_visitante_real: p.marcador_visitante_real,
    habilitado_para_predecir: p.habilitado_para_predecir,
    equipo_local: p.equipo_local as unknown as EquipoMini,
    equipo_visitante: p.equipo_visitante as unknown as EquipoMini,
    mi_prediccion: predByPartido.get(p.id) ?? null,
    count_preguntas_bonus: bonusCountByPartido.get(p.id) ?? 0,
  }))
}
