'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/admin'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { registrarAccion } from '@/lib/audit'
import {
  validateConfiguracion,
  type ConfiguracionInput,
} from '@/lib/configuracion-logic'
import { mundialIniciado } from '@/lib/queries/torneo'

export type ConfiguracionResult =
  | { success: true }
  | { success: false; error: string }

export interface ConfiguracionActionState {
  result: ConfiguracionResult | null
}

export const INITIAL_CONFIGURACION_STATE: ConfiguracionActionState = { result: null }

/**
 * Updates configuracion (row id=1) with the provided puntos + goleador.
 *
 * Lock semantics: once mundial_iniciado() == true, only goleador_oficial
 * can change. The action silently overwrites the puntos fields with the
 * current values when locked — the UI also disables those inputs, so the
 * lock here is just defense-in-depth.
 *
 * Every successful write records an `editar_config` audit entry with the
 * before/after JSON snapshots.
 */
export async function actualizarConfiguracion(
  _prev: ConfiguracionActionState,
  formData: FormData,
): Promise<ConfiguracionActionState> {
  const { user } = await requireAdmin()

  // Service-role for both read and write so the audit + update bypass RLS
  // cleanly and consistently.
  const client = createServiceRoleClient()

  const { data: actual, error: readError } = await client
    .from('configuracion')
    .select('*')
    .eq('id', 1)
    .single()

  if (readError || !actual) {
    return {
      result: {
        success: false,
        error: 'No pude leer la configuración actual.',
      },
    }
  }

  const locked = await mundialIniciado(client)

  const goleadorRaw = formData.get('goleador_oficial')
  const goleador: string | null =
    typeof goleadorRaw === 'string' && goleadorRaw.trim().length > 0
      ? goleadorRaw.trim()
      : null

  const input: ConfiguracionInput = {
    puntos_marcador_exacto: locked
      ? actual.puntos_marcador_exacto
      : numberOr(formData.get('puntos_marcador_exacto'), actual.puntos_marcador_exacto),
    puntos_solo_ganador: locked
      ? actual.puntos_solo_ganador
      : numberOr(formData.get('puntos_solo_ganador'), actual.puntos_solo_ganador),
    puntos_campeon: locked
      ? actual.puntos_campeon
      : numberOr(formData.get('puntos_campeon'), actual.puntos_campeon),
    puntos_subcampeon: locked
      ? actual.puntos_subcampeon
      : numberOr(formData.get('puntos_subcampeon'), actual.puntos_subcampeon),
    puntos_goleador: locked
      ? actual.puntos_goleador
      : numberOr(formData.get('puntos_goleador'), actual.puntos_goleador),
    goleador_oficial: goleador,
  }

  const validationError = validateConfiguracion(input)
  if (validationError) {
    return { result: { success: false, error: validationError } }
  }

  const { error: updateError } = await client
    .from('configuracion')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1)

  if (updateError) {
    return { result: { success: false, error: updateError.message } }
  }

  await registrarAccion({
    adminId: user.id,
    accion: 'editar_config',
    entidadTipo: 'configuracion',
    entidadId: null,
    valorAnterior: {
      puntos_marcador_exacto: actual.puntos_marcador_exacto,
      puntos_solo_ganador: actual.puntos_solo_ganador,
      puntos_campeon: actual.puntos_campeon,
      puntos_subcampeon: actual.puntos_subcampeon,
      puntos_goleador: actual.puntos_goleador,
      goleador_oficial: actual.goleador_oficial,
    },
    valorNuevo: input,
  })

  revalidatePath('/admin/configuracion')
  revalidatePath('/admin')

  return { result: { success: true } }
}

function numberOr(v: FormDataEntryValue | null, fallback: number): number {
  if (v === null) return fallback
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}
