'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  upsertPrediccionBonusCore,
  type BonusActionState,
} from '@/lib/predicciones-bonus-logic'
import type { TipoPreguntaBonus } from '@/lib/supabase/types'

/**
 * Server Action consumed by the bonus question forms (one form per question)
 * via useActionState. Parses FormData, coerces respuesta based on the
 * declared tipo (numero → Number, rest → string), checks auth, delegates
 * to the core, then revalidates the partido detail + dashboard so the new
 * answer surfaces immediately.
 *
 * Note: the tipo carried by FormData is the client's claim. The core
 * validates the respuesta shape against that tipo — a spoofed tipo would
 * still need to pass validation, and even then the only consequence is
 * the user's own prediction being unscoreable (zero points).
 */
export async function upsertPrediccionBonus(
  _prev: BonusActionState,
  formData: FormData,
): Promise<BonusActionState> {
  const preguntaBonusId = String(formData.get('preguntaBonusId') ?? '')
  const tipo = String(formData.get('tipo') ?? '') as TipoPreguntaBonus
  const partidoId = String(formData.get('partidoId') ?? '')

  if (!preguntaBonusId || !tipo) {
    return {
      result: {
        success: false,
        error: 'Faltan datos de la pregunta.',
      },
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
      // Malformed opciones in the form — fall back to no whitelist check.
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return {
      result: {
        success: false,
        error: 'Tu sesión expiró. Iniciá sesión otra vez.',
      },
    }
  }

  const result = await upsertPrediccionBonusCore(supabase, user.id, {
    preguntaBonusId,
    tipo,
    respuesta,
    opciones,
  })

  if (result.success && partidoId) {
    revalidatePath(`/partidos/${partidoId}`)
    revalidatePath('/')
  }

  return { result }
}
