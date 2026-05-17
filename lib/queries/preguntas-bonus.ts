import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Database,
  Json,
  TipoPreguntaBonus,
} from '@/lib/supabase/types'

type Client = SupabaseClient<Database>

export interface PreguntaBonusConMiRespuesta {
  id: string
  tipo: TipoPreguntaBonus
  enunciado: string
  /** For opcion_multiple: array of option strings; null for the rest. */
  opciones: string[] | null
  puntos: number
  /** Filled by the admin after the match. null until then. */
  respuesta_correcta: Json | null
  /** This user's answer (if any). */
  mi_respuesta: Json | null
  mi_puntos: number | null
}

/**
 * Returns every bonus question for the partido, with the caller's saved
 * answer merged in (null if they haven't answered). Order is creation
 * order so the form renders questions in the sequence the admin added
 * them.
 */
export async function obtenerPreguntasBonusPartido(
  supabase: Client,
  partidoId: string,
  userId: string,
): Promise<PreguntaBonusConMiRespuesta[]> {
  const [preguntasResult, prediccionesResult] = await Promise.all([
    supabase
      .from('preguntas_bonus')
      .select('id, tipo, enunciado, opciones, puntos, respuesta_correcta')
      .eq('partido_id', partidoId)
      .order('created_at', { ascending: true }),
    supabase
      .from('predicciones_bonus')
      .select('pregunta_bonus_id, respuesta, puntos_obtenidos')
      .eq('usuario_id', userId),
  ])

  if (preguntasResult.error) throw preguntasResult.error
  if (prediccionesResult.error) throw prediccionesResult.error

  const predByPregunta = new Map<
    string,
    { respuesta: Json; puntos_obtenidos: number }
  >()
  for (const p of prediccionesResult.data ?? []) {
    predByPregunta.set(p.pregunta_bonus_id, {
      respuesta: p.respuesta,
      puntos_obtenidos: p.puntos_obtenidos,
    })
  }

  return (preguntasResult.data ?? []).map((q) => {
    const mi = predByPregunta.get(q.id)
    // opciones is JSONB; for opcion_multiple we store an array of strings.
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
      mi_respuesta: mi?.respuesta ?? null,
      mi_puntos: mi?.puntos_obtenidos ?? null,
    }
  })
}
