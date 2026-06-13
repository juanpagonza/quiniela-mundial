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

export interface PrediccionBonusDeUsuario {
  usuario_id: string
  nombre: string
  foto_url: string | null
  respuesta: Json
  puntos_obtenidos: number
}

export interface PreguntaBonusConPredicciones {
  id: string
  tipo: TipoPreguntaBonus
  enunciado: string
  opciones: string[] | null
  puntos: number
  respuesta_correcta: Json | null
  predicciones: PrediccionBonusDeUsuario[]
}

export interface BonusPendiente {
  pregunta_bonus_id: string
  partido_id: string
  enunciado: string
  equipo_local_nombre: string
  equipo_visitante_nombre: string
  equipo_local_codigo_pais: string
  equipo_visitante_codigo_pais: string
  fecha_hora_kickoff: string
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

/**
 * Returns every bonus question for the partido with the FULL list of
 * everyone's answers. Used in the post-kickoff view so participants can
 * see how everyone answered (RLS in 00013_rls_bonus.sql already allows
 * this read once kickoff has passed). Predicciones are sorted by points
 * desc (winners first), then by nombre.
 */
export async function obtenerPrediccionesBonusGrupo(
  supabase: Client,
  partidoId: string,
): Promise<PreguntaBonusConPredicciones[]> {
  const { data: preguntas, error: preguntasError } = await supabase
    .from('preguntas_bonus')
    .select('id, tipo, enunciado, opciones, puntos, respuesta_correcta')
    .eq('partido_id', partidoId)
    .order('created_at', { ascending: true })

  if (preguntasError) throw preguntasError
  if (!preguntas || preguntas.length === 0) return []

  const preguntaIds = preguntas.map((p) => p.id)
  const { data: predicciones, error: prediccionesError } = await supabase
    .from('predicciones_bonus')
    .select(
      `pregunta_bonus_id, usuario_id, respuesta, puntos_obtenidos,
       usuario:usuarios!usuario_id (nombre, foto_url)`,
    )
    .in('pregunta_bonus_id', preguntaIds)

  if (prediccionesError) throw prediccionesError

  const predsByPregunta = new Map<string, PrediccionBonusDeUsuario[]>()
  for (const row of predicciones ?? []) {
    const usuario = row.usuario as unknown as {
      nombre: string
      foto_url: string | null
    }
    const entry: PrediccionBonusDeUsuario = {
      usuario_id: row.usuario_id,
      nombre: usuario?.nombre ?? 'Usuario',
      foto_url: usuario?.foto_url ?? null,
      respuesta: row.respuesta,
      puntos_obtenidos: row.puntos_obtenidos,
    }
    const existing = predsByPregunta.get(row.pregunta_bonus_id) ?? []
    existing.push(entry)
    predsByPregunta.set(row.pregunta_bonus_id, existing)
  }

  return preguntas.map((q) => {
    const opciones =
      Array.isArray(q.opciones) && q.opciones.every((o) => typeof o === 'string')
        ? (q.opciones as string[])
        : null
    const preds = predsByPregunta.get(q.id) ?? []
    preds.sort((a, b) => {
      if (b.puntos_obtenidos !== a.puntos_obtenidos) {
        return b.puntos_obtenidos - a.puntos_obtenidos
      }
      return a.nombre.localeCompare(b.nombre)
    })
    return {
      id: q.id,
      tipo: q.tipo,
      enunciado: q.enunciado,
      opciones,
      puntos: q.puntos,
      respuesta_correcta: q.respuesta_correcta,
      predicciones: preds,
    }
  })
}

interface BonusPendienteRaw {
  id: string
  enunciado: string
  partido: {
    id: string
    fecha_hora_kickoff: string
    habilitado_para_predecir: boolean
    equipo_local: { nombre: string; codigo_pais: string } | null
    equipo_visitante: { nombre: string; codigo_pais: string } | null
  } | null
}

/**
 * Pure filter/sort over the joined `preguntas_bonus + partido` rows:
 * drops anything already answered, anything whose partido is locked
 * (kickoff cutoff) or disabled, anything missing the embedded partido,
 * then sorts by kickoff ASC. Exported so unit tests can exercise the
 * branching logic without mocking Supabase.
 *
 * `cutoff` is the ISO string used in the time comparison — pass
 * `new Date(Date.now() + 60_000).toISOString()` to match the RLS rule
 * (kickoff > now() + 1 minute).
 */
export function filtrarBonusPendientes(
  preguntas: BonusPendienteRaw[],
  preguntasYaRespondidas: Iterable<string>,
  cutoff: string,
): BonusPendiente[] {
  const respondidas = new Set(preguntasYaRespondidas)

  const pendientes: BonusPendiente[] = []
  for (const pregunta of preguntas) {
    if (respondidas.has(pregunta.id)) continue

    const partido = pregunta.partido
    if (!partido) continue
    if (!partido.habilitado_para_predecir) continue
    if (partido.fecha_hora_kickoff <= cutoff) continue

    pendientes.push({
      pregunta_bonus_id: pregunta.id,
      partido_id: partido.id,
      enunciado: pregunta.enunciado,
      equipo_local_nombre: partido.equipo_local?.nombre ?? '',
      equipo_visitante_nombre: partido.equipo_visitante?.nombre ?? '',
      equipo_local_codigo_pais: partido.equipo_local?.codigo_pais ?? '',
      equipo_visitante_codigo_pais: partido.equipo_visitante?.codigo_pais ?? '',
      fecha_hora_kickoff: partido.fecha_hora_kickoff,
    })
  }

  pendientes.sort((a, b) =>
    a.fecha_hora_kickoff < b.fecha_hora_kickoff
      ? -1
      : a.fecha_hora_kickoff > b.fecha_hora_kickoff
        ? 1
        : 0,
  )

  return pendientes
}

/**
 * Returns bonus questions the user hasn't answered yet, scoped to partidos
 * that are still open for predictions. "Open" matches the RLS rule:
 * kickoff > now() + 1 minute AND habilitado_para_predecir = true.
 *
 * Strategy: fetch every bonus question joined with its partido, then fetch
 * the user's predicciones_bonus IDs and exclude them JS-side. Sorted by
 * kickoff ASC so the most urgent appear first. The filter/sort is split
 * out as `filtrarBonusPendientes` so tests don't need to mock Supabase.
 */
export async function obtenerBonusPendientes(
  supabase: Client,
  userId: string,
): Promise<BonusPendiente[]> {
  // The RLS time-lock uses now() + 1 minute, so we use the same client-side
  // cutoff to avoid showing a question the server would refuse to upsert.
  const cutoff = new Date(Date.now() + 60_000).toISOString()

  const [preguntasResult, prediccionesResult] = await Promise.all([
    supabase
      .from('preguntas_bonus')
      .select(
        `id, enunciado,
         partido:partidos!partido_id (
           id, fecha_hora_kickoff, habilitado_para_predecir,
           equipo_local:equipos!equipo_local_id (nombre, codigo_pais),
           equipo_visitante:equipos!equipo_visitante_id (nombre, codigo_pais)
         )`,
      ),
    supabase
      .from('predicciones_bonus')
      .select('pregunta_bonus_id')
      .eq('usuario_id', userId),
  ])

  if (preguntasResult.error) throw preguntasResult.error
  if (prediccionesResult.error) throw prediccionesResult.error

  const preguntas = (preguntasResult.data ?? []) as unknown as BonusPendienteRaw[]
  const yaRespondidas = (prediccionesResult.data ?? []).map(
    (p) => p.pregunta_bonus_id,
  )

  return filtrarBonusPendientes(preguntas, yaRespondidas, cutoff)
}
