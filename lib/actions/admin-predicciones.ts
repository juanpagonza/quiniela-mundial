'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/admin'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { registrarAccion } from '@/lib/audit'
import { MARCADOR_MAX, MARCADOR_MIN } from '@/lib/predicciones-logic'
import { validateRespuestaBonus } from '@/lib/predicciones-bonus-logic'
import type { AdminPrediccionActionState } from '@/lib/admin-predicciones-state'
import type { Json, TipoPreguntaBonus } from '@/lib/supabase/types'

function revalidarRutas(partidoId: string, usuarioId: string) {
  revalidatePath('/admin/predicciones')
  revalidatePath('/admin/auditoria')
  revalidatePath('/admin')
  revalidatePath('/tabla')
  revalidatePath('/')
  revalidatePath(`/partidos/${partidoId}`)
  // The affected user sees their (now-locked) prediction on the partido
  // detail page; nothing else routes per-user.
  void usuarioId
}

// ----- Editar predicción de partido --------------------------------------

export async function editarPrediccionPartidoAdmin(
  _prev: AdminPrediccionActionState,
  formData: FormData,
): Promise<AdminPrediccionActionState> {
  const { user } = await requireAdmin()

  const usuarioId = String(formData.get('usuarioId') ?? '')
  const partidoId = String(formData.get('partidoId') ?? '')
  if (!usuarioId || !partidoId) {
    return {
      result: { success: false, error: 'Faltan el usuario o el partido.' },
    }
  }

  const localRaw = formData.get('marcadorLocal')
  const visitRaw = formData.get('marcadorVisitante')
  const marcadorLocal = Number(localRaw)
  const marcadorVisitante = Number(visitRaw)

  if (
    !Number.isInteger(marcadorLocal) ||
    marcadorLocal < MARCADOR_MIN ||
    marcadorLocal > MARCADOR_MAX ||
    !Number.isInteger(marcadorVisitante) ||
    marcadorVisitante < MARCADOR_MIN ||
    marcadorVisitante > MARCADOR_MAX
  ) {
    return {
      result: {
        success: false,
        error: `Los marcadores deben ser enteros entre ${MARCADOR_MIN} y ${MARCADOR_MAX}.`,
      },
    }
  }

  const client = createServiceRoleClient()

  // Snapshot the old row so the audit log can show the diff.
  const { data: anterior } = await client
    .from('predicciones_partido')
    .select(
      'id, marcador_local, marcador_visitante, puntos_obtenidos, editado_por_admin',
    )
    .eq('usuario_id', usuarioId)
    .eq('partido_id', partidoId)
    .maybeSingle()

  const { data: nueva, error } = await client
    .from('predicciones_partido')
    .upsert(
      {
        usuario_id: usuarioId,
        partido_id: partidoId,
        marcador_local: marcadorLocal,
        marcador_visitante: marcadorVisitante,
        editado_por_admin: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'usuario_id,partido_id' },
    )
    .select('id')
    .single()

  if (error) return { result: { success: false, error: error.message } }

  // If the partido is already finalized, the regular partidos-update
  // trigger won't fire (we only edited the prediction). Recompute the
  // points for the whole partido — this just re-runs the same scorer
  // for everyone, idempotently.
  const { data: partido } = await client
    .from('partidos')
    .select(
      'estado, marcador_local_real, marcador_visitante_real',
    )
    .eq('id', partidoId)
    .single()

  if (
    partido?.estado === 'finalizado' &&
    partido.marcador_local_real != null &&
    partido.marcador_visitante_real != null
  ) {
    const { error: rpcError } = await client.rpc('calcular_puntos_partido', {
      p_partido_id: partidoId,
    })
    if (rpcError) {
      // Don't fail the user-visible action — the edit landed; only the
      // recalc misfired. Log loudly so it surfaces in Vercel logs.
      console.error('[admin] calcular_puntos_partido failed:', rpcError)
    }
  }

  await registrarAccion({
    adminId: user.id,
    accion: 'editar_prediccion_partido',
    entidadTipo: 'prediccion_partido',
    entidadId: nueva.id,
    valorAnterior: {
      usuario_id: usuarioId,
      partido_id: partidoId,
      marcador_local: anterior?.marcador_local ?? null,
      marcador_visitante: anterior?.marcador_visitante ?? null,
      puntos_obtenidos: anterior?.puntos_obtenidos ?? 0,
      editado_por_admin: anterior?.editado_por_admin ?? false,
    },
    valorNuevo: {
      usuario_id: usuarioId,
      partido_id: partidoId,
      marcador_local: marcadorLocal,
      marcador_visitante: marcadorVisitante,
      editado_por_admin: true,
    },
  })

  revalidarRutas(partidoId, usuarioId)
  return { result: { success: true, message: 'Predicción actualizada' } }
}

// ----- Editar predicción bonus -------------------------------------------

export async function editarPrediccionBonusAdmin(
  _prev: AdminPrediccionActionState,
  formData: FormData,
): Promise<AdminPrediccionActionState> {
  const { user } = await requireAdmin()

  const usuarioId = String(formData.get('usuarioId') ?? '')
  const preguntaBonusId = String(formData.get('preguntaBonusId') ?? '')
  const partidoId = String(formData.get('partidoId') ?? '')
  const tipo = String(formData.get('tipo') ?? '') as TipoPreguntaBonus

  if (!usuarioId || !preguntaBonusId || !tipo) {
    return {
      result: { success: false, error: 'Faltan datos de la pregunta.' },
    }
  }

  const respuestaRaw = formData.get('respuesta')
  const respuesta: number | string =
    tipo === 'numero' ? Number(respuestaRaw) : String(respuestaRaw ?? '')

  const opcionesRaw = formData.get('opciones')
  let opciones: string[] | null = null
  if (typeof opcionesRaw === 'string' && opcionesRaw.length > 0) {
    try {
      const parsed: unknown = JSON.parse(opcionesRaw)
      if (Array.isArray(parsed) && parsed.every((o) => typeof o === 'string')) {
        opciones = parsed
      }
    } catch {
      // Malformed — fall through with opciones=null, the validator will
      // still check shape against tipo.
    }
  }

  const validation = validateRespuestaBonus(tipo, respuesta, opciones)
  if (!validation.ok) {
    return { result: { success: false, error: validation.error } }
  }

  const client = createServiceRoleClient()

  const { data: anterior } = await client
    .from('predicciones_bonus')
    .select('id, respuesta, puntos_obtenidos, editado_por_admin')
    .eq('usuario_id', usuarioId)
    .eq('pregunta_bonus_id', preguntaBonusId)
    .maybeSingle()

  const { data: nueva, error } = await client
    .from('predicciones_bonus')
    .upsert(
      {
        usuario_id: usuarioId,
        pregunta_bonus_id: preguntaBonusId,
        respuesta: validation.respuestaJson as Json,
        editado_por_admin: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'usuario_id,pregunta_bonus_id' },
    )
    .select('id')
    .single()

  if (error) return { result: { success: false, error: error.message } }

  // If the pregunta already has a respuesta_correcta, recompute. The
  // trigger on preguntas_bonus only fires when respuesta_correcta itself
  // changes — editing a participant's answer needs a manual nudge.
  const { data: pregunta } = await client
    .from('preguntas_bonus')
    .select('respuesta_correcta')
    .eq('id', preguntaBonusId)
    .single()

  if (pregunta?.respuesta_correcta != null) {
    const { error: rpcError } = await client.rpc('calcular_puntos_bonus', {
      p_pregunta_id: preguntaBonusId,
    })
    if (rpcError) {
      console.error('[admin] calcular_puntos_bonus failed:', rpcError)
    }
  }

  await registrarAccion({
    adminId: user.id,
    accion: 'editar_prediccion_bonus',
    entidadTipo: 'prediccion_bonus',
    entidadId: nueva.id,
    valorAnterior: {
      usuario_id: usuarioId,
      pregunta_bonus_id: preguntaBonusId,
      respuesta: anterior?.respuesta ?? null,
      puntos_obtenidos: anterior?.puntos_obtenidos ?? 0,
      editado_por_admin: anterior?.editado_por_admin ?? false,
    },
    valorNuevo: {
      usuario_id: usuarioId,
      pregunta_bonus_id: preguntaBonusId,
      respuesta: validation.respuestaJson as Json,
      editado_por_admin: true,
    },
  })

  if (partidoId) revalidarRutas(partidoId, usuarioId)
  return { result: { success: true, message: 'Respuesta actualizada' } }
}
