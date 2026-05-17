import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Database,
  EstadoPartido,
  FasePartido,
  Json,
  TipoPreguntaBonus,
} from '@/lib/supabase/types'
import type { EquipoMini } from './partidos'

type Client = SupabaseClient<Database>

export interface PartidoAdmin {
  id: string
  fase: FasePartido
  estado: EstadoPartido
  fecha_hora_kickoff: string
  marcador_local_real: number | null
  marcador_visitante_real: number | null
  habilitado_para_predecir: boolean
  equipo_local: EquipoMini
  equipo_visitante: EquipoMini
}

export interface PreguntaBonusAdmin {
  id: string
  tipo: TipoPreguntaBonus
  enunciado: string
  opciones: string[] | null
  puntos: number
  respuesta_correcta: Json | null
}

export async function obtenerPartidoAdmin(
  supabase: Client,
  partidoId: string,
): Promise<PartidoAdmin | null> {
  const { data, error } = await supabase
    .from('partidos')
    .select(
      `id, fase, estado, fecha_hora_kickoff,
       marcador_local_real, marcador_visitante_real, habilitado_para_predecir,
       equipo_local:equipos!equipo_local_id (id, nombre, codigo_pais),
       equipo_visitante:equipos!equipo_visitante_id (id, nombre, codigo_pais)`,
    )
    .eq('id', partidoId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return {
    id: data.id,
    fase: data.fase,
    estado: data.estado,
    fecha_hora_kickoff: data.fecha_hora_kickoff,
    marcador_local_real: data.marcador_local_real,
    marcador_visitante_real: data.marcador_visitante_real,
    habilitado_para_predecir: data.habilitado_para_predecir,
    equipo_local: data.equipo_local as unknown as EquipoMini,
    equipo_visitante: data.equipo_visitante as unknown as EquipoMini,
  }
}

export async function obtenerPreguntasBonusAdmin(
  supabase: Client,
  partidoId: string,
): Promise<PreguntaBonusAdmin[]> {
  const { data, error } = await supabase
    .from('preguntas_bonus')
    .select('id, tipo, enunciado, opciones, puntos, respuesta_correcta')
    .eq('partido_id', partidoId)
    .order('created_at', { ascending: true })

  if (error) throw error

  return (data ?? []).map((q) => {
    const opciones =
      Array.isArray(q.opciones) && q.opciones.every((o) => typeof o === 'string')
        ? (q.opciones as string[])
        : null
    return {
      id: q.id,
      tipo: q.tipo,
      enunciado: q.enunciado,
      opciones,
      puntos: q.puntos,
      respuesta_correcta: q.respuesta_correcta,
    }
  })
}
