'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { requireAdmin } from '@/lib/auth/admin'
import {
  validateCrearPregunta,
  type AdminBonusActionState,
  type CrearPreguntaInput,
} from '@/lib/preguntas-bonus-logic'
import { validateRespuestaBonus } from '@/lib/predicciones-bonus-logic'
import type { TipoPreguntaBonus } from '@/lib/supabase/types'

// --- Helpers ------------------------------------------------------------

function parseOpcionesField(raw: FormDataEntryValue | null): string[] | null {
  if (typeof raw !== 'string' || raw.trim().length === 0) return null
  // Admin enters one option per line (textarea). Trim + drop blanks.
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
  return lines.length > 0 ? lines : null
}

function revalidateAdminPaths(partidoId: string) {
  revalidatePath(`/admin/partidos/${partidoId}`)
  revalidatePath(`/partidos/${partidoId}`)
  revalidatePath('/partidos')
  revalidatePath('/')
}

// --- Crear --------------------------------------------------------------

export async function crearPreguntaBonus(
  _prev: AdminBonusActionState,
  formData: FormData,
): Promise<AdminBonusActionState> {
  await requireAdmin()

  const input: CrearPreguntaInput = {
    partidoId: String(formData.get('partidoId') ?? ''),
    tipo: String(formData.get('tipo') ?? '') as TipoPreguntaBonus,
    enunciado: String(formData.get('enunciado') ?? ''),
    opciones: parseOpcionesField(formData.get('opciones')),
    puntos: Number(formData.get('puntos') ?? 2),
  }

  const validationError = validateCrearPregunta(input)
  if (validationError) {
    return { result: { success: false, error: validationError } }
  }

  // service-role for the write: preguntas_bonus admin_write RLS would also
  // accept the admin's normal session, but service-role keeps the action
  // independent of the caller's RLS context and matches the pattern used
  // by importar-fixture.
  const client = createServiceRoleClient()
  const { error } = await client.from('preguntas_bonus').insert({
    partido_id: input.partidoId,
    tipo: input.tipo,
    enunciado: input.enunciado.trim(),
    opciones: input.opciones,
    puntos: input.puntos,
  })

  if (error) {
    return { result: { success: false, error: error.message } }
  }

  revalidateAdminPaths(input.partidoId)
  return { result: { success: true } }
}

// --- Editar -------------------------------------------------------------

export async function editarPreguntaBonus(
  _prev: AdminBonusActionState,
  formData: FormData,
): Promise<AdminBonusActionState> {
  await requireAdmin()

  const preguntaId = String(formData.get('preguntaId') ?? '')
  const partidoId = String(formData.get('partidoId') ?? '')

  if (!preguntaId || !partidoId) {
    return { result: { success: false, error: 'Faltan datos de la pregunta.' } }
  }

  const input: CrearPreguntaInput = {
    partidoId,
    tipo: String(formData.get('tipo') ?? '') as TipoPreguntaBonus,
    enunciado: String(formData.get('enunciado') ?? ''),
    opciones: parseOpcionesField(formData.get('opciones')),
    puntos: Number(formData.get('puntos') ?? 2),
  }

  const validationError = validateCrearPregunta(input)
  if (validationError) {
    return { result: { success: false, error: validationError } }
  }

  const client = createServiceRoleClient()
  const { error } = await client
    .from('preguntas_bonus')
    .update({
      tipo: input.tipo,
      enunciado: input.enunciado.trim(),
      opciones: input.opciones,
      puntos: input.puntos,
      updated_at: new Date().toISOString(),
    })
    .eq('id', preguntaId)

  if (error) {
    return { result: { success: false, error: error.message } }
  }

  revalidateAdminPaths(partidoId)
  return { result: { success: true } }
}

// --- Eliminar -----------------------------------------------------------

export async function eliminarPreguntaBonus(
  _prev: AdminBonusActionState,
  formData: FormData,
): Promise<AdminBonusActionState> {
  await requireAdmin()

  const preguntaId = String(formData.get('preguntaId') ?? '')
  const partidoId = String(formData.get('partidoId') ?? '')

  if (!preguntaId) {
    return { result: { success: false, error: 'Falta el id de la pregunta.' } }
  }

  const client = createServiceRoleClient()
  const { error } = await client
    .from('preguntas_bonus')
    .delete()
    .eq('id', preguntaId)

  if (error) {
    return { result: { success: false, error: error.message } }
  }

  if (partidoId) revalidateAdminPaths(partidoId)
  return { result: { success: true } }
}

// --- Setear respuesta correcta -------------------------------------------

export async function setearRespuestaCorrecta(
  _prev: AdminBonusActionState,
  formData: FormData,
): Promise<AdminBonusActionState> {
  await requireAdmin()

  const preguntaId = String(formData.get('preguntaId') ?? '')
  const tipo = String(formData.get('tipo') ?? '') as TipoPreguntaBonus
  const partidoId = String(formData.get('partidoId') ?? '')
  const respuestaRaw = formData.get('respuesta')
  const opcionesRaw = formData.get('opciones')

  if (!preguntaId || !tipo) {
    return { result: { success: false, error: 'Faltan datos.' } }
  }

  const respuesta: number | string =
    tipo === 'numero' ? Number(respuestaRaw) : String(respuestaRaw ?? '')

  let opciones: string[] | null = null
  if (typeof opcionesRaw === 'string' && opcionesRaw.length > 0) {
    try {
      const parsed: unknown = JSON.parse(opcionesRaw)
      if (Array.isArray(parsed) && parsed.every((o) => typeof o === 'string')) {
        opciones = parsed
      }
    } catch {
      // fall through
    }
  }

  const v = validateRespuestaBonus(tipo, respuesta, opciones)
  if (!v.ok) {
    return { result: { success: false, error: v.error } }
  }

  const client = createServiceRoleClient()
  const { error } = await client
    .from('preguntas_bonus')
    .update({
      respuesta_correcta: v.respuestaJson,
      updated_at: new Date().toISOString(),
    })
    .eq('id', preguntaId)

  if (error) {
    return { result: { success: false, error: error.message } }
  }

  // The DB trigger recomputes puntos on every prediction for this question,
  // so revalidate the tabla and the dashboard too.
  if (partidoId) revalidateAdminPaths(partidoId)
  revalidatePath('/tabla')
  revalidatePath('/perfil')

  return { result: { success: true } }
}
