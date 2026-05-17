import type { TipoPreguntaBonus } from '@/lib/supabase/types'

export interface CrearPreguntaInput {
  partidoId: string
  tipo: TipoPreguntaBonus
  enunciado: string
  /** Required for opcion_multiple; ignored for the rest. */
  opciones: string[] | null
  puntos: number
}

/**
 * Validates a "create bonus question" payload from the admin. Returns null
 * when everything is OK, or a user-facing Spanish error string. The same
 * shape is reused for edit (just don't change tipo on edit).
 *
 * Validation choices:
 *   - puntos must be a positive integer. Zero-point questions would clutter
 *     the leaderboard with no upside.
 *   - opcion_multiple requires ≥ 2 non-empty options. One option isn't a
 *     choice; zero is meaningless.
 *   - opciones is ignored (not checked) for tipos other than opcion_multiple,
 *     so the admin can pass null or a stale array without erroring.
 */
export function validateCrearPregunta(input: CrearPreguntaInput): string | null {
  if (!input.partidoId) {
    return 'Falta el id del partido.'
  }
  if (!input.enunciado.trim()) {
    return 'El enunciado es obligatorio.'
  }
  if (!Number.isInteger(input.puntos) || input.puntos < 1) {
    return 'Los puntos deben ser un entero >= 1.'
  }
  if (input.tipo === 'opcion_multiple') {
    if (!input.opciones || input.opciones.length < 2) {
      return 'Las preguntas de opción múltiple necesitan al menos 2 opciones.'
    }
    if (input.opciones.some((o) => !o.trim())) {
      return 'Las opciones no pueden estar vacías.'
    }
  }
  return null
}
