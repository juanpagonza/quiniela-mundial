'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  upsertPrediccionPartidoCore,
  type PrediccionActionState,
} from '@/lib/predicciones-logic'

/**
 * Server Action consumed by FormularioPrediccion via useActionState.
 *
 * Reads partidoId + marcadores from FormData, gates on auth, then delegates
 * the validation + upsert to the core function (which is unit-tested).
 *
 * On success it revalidates the routes that show the prediction so the user
 * sees their new bet without a manual refresh: the match list, the dashboard,
 * and this match's own detail page.
 */
export async function upsertPrediccionPartido(
  _prev: PrediccionActionState,
  formData: FormData,
): Promise<PrediccionActionState> {
  const partidoId = String(formData.get('partidoId') ?? '')
  const marcadorLocal = Number(formData.get('marcadorLocal'))
  const marcadorVisitante = Number(formData.get('marcadorVisitante'))

  if (!partidoId) {
    return { result: { success: false, error: 'Falta el id del partido.' } }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { result: { success: false, error: 'Tu sesión expiró. Iniciá sesión otra vez.' } }
  }

  const result = await upsertPrediccionPartidoCore(supabase, user.id, {
    partidoId,
    marcadorLocal,
    marcadorVisitante,
  })

  if (result.success) {
    revalidatePath(`/partidos/${partidoId}`)
    revalidatePath('/partidos')
    revalidatePath('/')
  }

  return { result }
}
