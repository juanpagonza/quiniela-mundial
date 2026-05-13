import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

type Client = SupabaseClient<Database>

// Bounds for marcador inputs. Matched in the HTML form via min/max attributes
// and re-enforced server-side here so a malicious or stale client can't sneak
// values past. Real games rarely go past single digits; 20 is the panic ceiling.
export const MARCADOR_MIN = 0
export const MARCADOR_MAX = 20

export interface UpsertInput {
  partidoId: string
  marcadorLocal: number
  marcadorVisitante: number
}

export type UpsertResult =
  | { success: true }
  | { success: false; error: string }

function validate(input: UpsertInput): string | null {
  const { marcadorLocal, marcadorVisitante } = input
  if (!Number.isInteger(marcadorLocal) || marcadorLocal < MARCADOR_MIN) {
    return `El marcador local debe ser un entero desde ${MARCADOR_MIN}.`
  }
  if (!Number.isInteger(marcadorVisitante) || marcadorVisitante < MARCADOR_MIN) {
    return `El marcador visitante debe ser un entero desde ${MARCADOR_MIN}.`
  }
  if (marcadorLocal > MARCADOR_MAX || marcadorVisitante > MARCADOR_MAX) {
    return `El marcador no puede ser mayor a ${MARCADOR_MAX}.`
  }
  return null
}

/**
 * Pure business logic for predicción-partido upsert. Validates the marcadores
 * against the same bounds the form enforces, then upserts using the
 * (usuario_id, partido_id) UNIQUE constraint so re-submits replace the row.
 *
 * RLS does the *real* gatekeeping (lock window, ownership) at the DB level. We
 * detect its rejection by Postgres SQLSTATE 42501 and rewrite the message
 * to the user-facing "predicciones cerradas". Any other DB error surfaces
 * its raw message so it shows up in logs and the user sees something
 * actionable.
 */
export async function upsertPrediccionPartidoCore(
  supabase: Client,
  userId: string,
  input: UpsertInput,
): Promise<UpsertResult> {
  const validationError = validate(input)
  if (validationError) return { success: false, error: validationError }

  const { error } = await supabase
    .from('predicciones_partido')
    .upsert(
      {
        usuario_id: userId,
        partido_id: input.partidoId,
        marcador_local: input.marcadorLocal,
        marcador_visitante: input.marcadorVisitante,
      },
      { onConflict: 'usuario_id,partido_id' },
    )

  if (error) {
    if ((error as { code?: string }).code === '42501') {
      return {
        success: false,
        error: 'Las predicciones para este partido están cerradas.',
      }
    }
    return { success: false, error: error.message }
  }

  return { success: true }
}
