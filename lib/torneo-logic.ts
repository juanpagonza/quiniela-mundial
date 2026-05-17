import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

type Client = SupabaseClient<Database>

export interface UpsertTorneoInput {
  campeon_equipo_id: string | null
  subcampeon_equipo_id: string | null
  goleador_nombre: string | null
}

export type UpsertTorneoResult =
  | { success: true }
  | { success: false; error: string }

export interface TorneoActionState {
  result: UpsertTorneoResult | null
}

export const INITIAL_TORNEO_STATE: TorneoActionState = { result: null }

/**
 * Partial saves are allowed — users can fill in campeón, come back later for
 * subcampeón, etc. The only cross-field rule we enforce is "campeón !=
 * subcampeón" (no team can finish both first and second). Goleador is free
 * text that the admin grades later via unaccent + lower comparison.
 *
 * RLS at the DB level enforces ownership + the mundial_iniciado lock; the
 * 42501 PostgreSQL error gets surfaced as a friendly "cerrada" message.
 */
export async function upsertPrediccionTorneoCore(
  supabase: Client,
  userId: string,
  input: UpsertTorneoInput,
): Promise<UpsertTorneoResult> {
  if (
    input.campeon_equipo_id &&
    input.subcampeon_equipo_id &&
    input.campeon_equipo_id === input.subcampeon_equipo_id
  ) {
    return {
      success: false,
      error: 'El campeón y el subcampeón tienen que ser equipos distintos.',
    }
  }

  const goleador = input.goleador_nombre?.trim()
  const goleadorFinal = goleador && goleador.length > 0 ? goleador : null

  const { error } = await supabase
    .from('predicciones_torneo')
    .upsert(
      {
        usuario_id: userId,
        campeon_equipo_id: input.campeon_equipo_id,
        subcampeon_equipo_id: input.subcampeon_equipo_id,
        goleador_nombre: goleadorFinal,
      },
      { onConflict: 'usuario_id' },
    )

  if (error) {
    if ((error as { code?: string }).code === '42501') {
      return {
        success: false,
        error: 'La quiniela del Mundial ya está cerrada.',
      }
    }
    return { success: false, error: error.message }
  }

  return { success: true }
}
