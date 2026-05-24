'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/admin'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { registrarAccion } from '@/lib/audit'
import {
  validateCrearAjuste,
  type CrearAjusteInput,
} from '@/lib/ajustes-logic'

export type AjusteResult =
  | { success: true }
  | { success: false; error: string }

export interface AjusteActionState {
  result: AjusteResult | null
}

export const INITIAL_AJUSTE_STATE: AjusteActionState = { result: null }

export async function crearAjuste(
  _prev: AjusteActionState,
  formData: FormData,
): Promise<AjusteActionState> {
  const { user } = await requireAdmin()

  const input: CrearAjusteInput = {
    usuario_id: String(formData.get('usuario_id') ?? ''),
    puntos: Number(formData.get('puntos') ?? 0),
    motivo: String(formData.get('motivo') ?? ''),
  }

  const validationError = validateCrearAjuste(input)
  if (validationError) {
    return { result: { success: false, error: validationError } }
  }

  const client = createServiceRoleClient()
  const motivoTrim = input.motivo.trim()

  const { data: ajuste, error } = await client
    .from('ajustes_puntos_manuales')
    .insert({
      usuario_id: input.usuario_id,
      admin_id: user.id,
      puntos: input.puntos,
      motivo: motivoTrim,
    })
    .select('id')
    .single()

  if (error) {
    return { result: { success: false, error: error.message } }
  }

  await registrarAccion({
    adminId: user.id,
    accion: 'ajuste_puntos_manual',
    entidadTipo: 'ajuste_puntos_manual',
    entidadId: ajuste?.id ?? null,
    valorAnterior: null,
    valorNuevo: {
      usuario_id: input.usuario_id,
      puntos: input.puntos,
      motivo: motivoTrim,
    },
    motivo: motivoTrim,
  })

  revalidatePath('/admin/ajustes')
  revalidatePath('/admin')
  revalidatePath('/tabla')
  revalidatePath('/perfil')
  revalidatePath('/')

  return { result: { success: true } }
}
