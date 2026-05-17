import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, TipoPreguntaBonus } from '@/lib/supabase/types'

type Client = SupabaseClient<Database>

export interface UpsertBonusInput {
  preguntaBonusId: string
  tipo: TipoPreguntaBonus
  /** number for tipo='numero', string for the rest. */
  respuesta: number | string
  /** Whitelisted option strings for tipo='opcion_multiple'. Optional check. */
  opciones?: string[] | null
}

export type UpsertBonusResult =
  | { success: true }
  | { success: false; error: string }

// Shape consumed by useActionState in the bonus form. Kept out of the
// 'use server' action file (those can only export async fns).
export interface BonusActionState {
  result: UpsertBonusResult | null
}

export const INITIAL_BONUS_STATE: BonusActionState = { result: null }

export type RespuestaBonusValidada =
  | { ok: true; respuestaJson: number | string }
  | { ok: false; error: string }

/**
 * Shared validator for any caller submitting a bonus respuesta — both the
 * participant's prediction and the admin's respuesta_correcta go through here.
 * Returns the JSON-serializable value to store, or an error message.
 */
export function validateRespuestaBonus(
  tipo: TipoPreguntaBonus,
  respuesta: number | string,
  opciones?: string[] | null,
): RespuestaBonusValidada {
  switch (tipo) {
    case 'numero': {
      const n = respuesta
      if (typeof n !== 'number' || !Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
        return { ok: false, error: 'La respuesta debe ser un entero no negativo.' }
      }
      return { ok: true, respuestaJson: n }
    }
    case 'over_under': {
      if (respuesta !== 'over' && respuesta !== 'under') {
        return { ok: false, error: 'Respuesta inválida.' }
      }
      return { ok: true, respuestaJson: respuesta }
    }
    case 'si_no': {
      if (respuesta !== 'si' && respuesta !== 'no') {
        return { ok: false, error: 'Respuesta inválida.' }
      }
      return { ok: true, respuestaJson: respuesta }
    }
    case 'opcion_multiple': {
      if (typeof respuesta !== 'string' || respuesta.length === 0) {
        return { ok: false, error: 'Elegí una opción.' }
      }
      if (opciones && !opciones.includes(respuesta)) {
        return { ok: false, error: 'La respuesta no está entre las opciones permitidas.' }
      }
      return { ok: true, respuestaJson: respuesta }
    }
    default:
      return { ok: false, error: 'Tipo de pregunta desconocido.' }
  }
}

/**
 * Pure core for upserting a bonus prediction. The respuesta is validated
 * against the declared `tipo` so the JSONB stored matches what
 * calcular_puntos_bonus will compare against — e.g., numero stores a JSON
 * number (not "3"-the-string), so equality with the admin's respuesta_correcta
 * actually matches.
 *
 * RLS at the DB level enforces ownership + the kickoff lock; 42501 is mapped
 * to a user-facing "cerradas" message.
 */
export async function upsertPrediccionBonusCore(
  supabase: Client,
  userId: string,
  input: UpsertBonusInput,
): Promise<UpsertBonusResult> {
  const v = validateRespuestaBonus(input.tipo, input.respuesta, input.opciones)
  if (!v.ok) return { success: false, error: v.error }

  const { error } = await supabase
    .from('predicciones_bonus')
    .upsert(
      {
        usuario_id: userId,
        pregunta_bonus_id: input.preguntaBonusId,
        respuesta: v.respuestaJson,
      },
      { onConflict: 'usuario_id,pregunta_bonus_id' },
    )

  if (error) {
    if ((error as { code?: string }).code === '42501') {
      return {
        success: false,
        error: 'Las predicciones para esta pregunta están cerradas.',
      }
    }
    return { success: false, error: error.message }
  }

  return { success: true }
}
