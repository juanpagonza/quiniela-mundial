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

export interface UsuarioPickerItem {
  id: string
  nombre: string
}

export interface PartidoPickerItem {
  id: string
  fase: FasePartido
  estado: EstadoPartido
  fecha_hora_kickoff: string
  equipo_local_nombre: string
  equipo_visitante_nombre: string
}

export interface PrediccionPartidoAdmin {
  id: string | null
  marcador_local: number | null
  marcador_visitante: number | null
  editado_por_admin: boolean
  puntos_obtenidos: number
}

export interface PrediccionBonusAdmin {
  id: string | null
  pregunta_id: string
  tipo: TipoPreguntaBonus
  enunciado: string
  opciones: string[] | null
  puntos: number
  respuesta_correcta: Json | null
  respuesta: Json | null
  editado_por_admin: boolean
  puntos_obtenidos: number
}

export interface PartidoConPrediccion {
  partido: {
    id: string
    fase: FasePartido
    estado: EstadoPartido
    fecha_hora_kickoff: string
    marcador_local_real: number | null
    marcador_visitante_real: number | null
    equipo_local: EquipoMini
    equipo_visitante: EquipoMini
  }
  prediccion: PrediccionPartidoAdmin
  bonus: PrediccionBonusAdmin[]
}

/** Lista de usuarios para el dropdown del picker. Ordenada alfabéticamente. */
export async function obtenerUsuariosParaPredicciones(
  supabase: Client,
): Promise<UsuarioPickerItem[]> {
  const { data, error } = await supabase
    .from('usuarios')
    .select('id, nombre')
    .order('nombre', { ascending: true })
  if (error) throw error
  return data ?? []
}

/**
 * Lista compacta de partidos para el dropdown del picker. Ordenada por
 * kickoff descendente — los recién finalizados están arriba, que es lo
 * más probable que el admin esté corrigiendo.
 */
export async function obtenerPartidosParaPredicciones(
  supabase: Client,
): Promise<PartidoPickerItem[]> {
  const { data, error } = await supabase
    .from('partidos')
    .select(
      `id, fase, estado, fecha_hora_kickoff,
       equipo_local:equipos!equipo_local_id (nombre),
       equipo_visitante:equipos!equipo_visitante_id (nombre)`,
    )
    .order('fecha_hora_kickoff', { ascending: false })
  if (error) throw error
  return (data ?? []).map((p) => {
    const local = p.equipo_local as unknown as { nombre: string } | null
    const visit = p.equipo_visitante as unknown as { nombre: string } | null
    return {
      id: p.id,
      fase: p.fase,
      estado: p.estado,
      fecha_hora_kickoff: p.fecha_hora_kickoff,
      equipo_local_nombre: local?.nombre ?? '—',
      equipo_visitante_nombre: visit?.nombre ?? '—',
    }
  })
}

/**
 * Resuelve todo lo que necesita el editor: el partido, la predicción del
 * usuario (o stub vacío si no predijo), y cada pregunta bonus con la
 * respuesta del usuario en la misma fila. Usa una sola tanda paralela
 * para minimizar latencia. El caller debe haber validado que ambos IDs
 * existen — devolvemos null si el partido no existe.
 */
export async function obtenerPrediccionAdmin(
  supabase: Client,
  usuarioId: string,
  partidoId: string,
): Promise<PartidoConPrediccion | null> {
  const partidoQuery = supabase
    .from('partidos')
    .select(
      `id, fase, estado, fecha_hora_kickoff,
       marcador_local_real, marcador_visitante_real,
       equipo_local:equipos!equipo_local_id (id, nombre, codigo_pais),
       equipo_visitante:equipos!equipo_visitante_id (id, nombre, codigo_pais)`,
    )
    .eq('id', partidoId)
    .maybeSingle()

  const prediccionQuery = supabase
    .from('predicciones_partido')
    .select(
      'id, marcador_local, marcador_visitante, editado_por_admin, puntos_obtenidos',
    )
    .eq('partido_id', partidoId)
    .eq('usuario_id', usuarioId)
    .maybeSingle()

  const preguntasQuery = supabase
    .from('preguntas_bonus')
    .select('id, tipo, enunciado, opciones, puntos, respuesta_correcta')
    .eq('partido_id', partidoId)
    .order('created_at', { ascending: true })

  const [partidoRes, prediccionRes, preguntasRes] = await Promise.all([
    partidoQuery,
    prediccionQuery,
    preguntasQuery,
  ])

  if (partidoRes.error) throw partidoRes.error
  if (!partidoRes.data) return null
  if (prediccionRes.error) throw prediccionRes.error
  if (preguntasRes.error) throw preguntasRes.error

  const preguntas = preguntasRes.data ?? []
  const preguntaIds = preguntas.map((q) => q.id)

  // Fetch the user's bonus answers in one shot (one round-trip total
  // regardless of how many preguntas exist for this partido).
  const bonusRespuestas = preguntaIds.length
    ? await supabase
        .from('predicciones_bonus')
        .select(
          'id, pregunta_bonus_id, respuesta, editado_por_admin, puntos_obtenidos',
        )
        .eq('usuario_id', usuarioId)
        .in('pregunta_bonus_id', preguntaIds)
    : { data: [], error: null as null | { message: string } }

  if (bonusRespuestas.error) throw bonusRespuestas.error
  const respuestaPorPregunta = new Map(
    (bonusRespuestas.data ?? []).map((r) => [r.pregunta_bonus_id, r]),
  )

  const bonus: PrediccionBonusAdmin[] = preguntas.map((q) => {
    const opciones =
      Array.isArray(q.opciones) && q.opciones.every((o) => typeof o === 'string')
        ? (q.opciones as string[])
        : null
    const respuesta = respuestaPorPregunta.get(q.id)
    return {
      id: respuesta?.id ?? null,
      pregunta_id: q.id,
      tipo: q.tipo,
      enunciado: q.enunciado,
      opciones,
      puntos: q.puntos,
      respuesta_correcta: q.respuesta_correcta,
      respuesta: respuesta?.respuesta ?? null,
      editado_por_admin: respuesta?.editado_por_admin ?? false,
      puntos_obtenidos: respuesta?.puntos_obtenidos ?? 0,
    }
  })

  return {
    partido: {
      id: partidoRes.data.id,
      fase: partidoRes.data.fase,
      estado: partidoRes.data.estado,
      fecha_hora_kickoff: partidoRes.data.fecha_hora_kickoff,
      marcador_local_real: partidoRes.data.marcador_local_real,
      marcador_visitante_real: partidoRes.data.marcador_visitante_real,
      equipo_local: partidoRes.data.equipo_local as unknown as EquipoMini,
      equipo_visitante:
        partidoRes.data.equipo_visitante as unknown as EquipoMini,
    },
    prediccion: {
      id: prediccionRes.data?.id ?? null,
      marcador_local: prediccionRes.data?.marcador_local ?? null,
      marcador_visitante: prediccionRes.data?.marcador_visitante ?? null,
      editado_por_admin: prediccionRes.data?.editado_por_admin ?? false,
      puntos_obtenidos: prediccionRes.data?.puntos_obtenidos ?? 0,
    },
    bonus,
  }
}
