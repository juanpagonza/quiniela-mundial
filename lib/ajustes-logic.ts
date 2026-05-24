// Server Action state shapes for the ajustes form. Kept here (not in
// the 'use server' action file) because that file can only export async
// functions — a const object export would crash at module evaluation.
export type AjusteResult =
  | { success: true }
  | { success: false; error: string }

export interface AjusteActionState {
  result: AjusteResult | null
}

export const INITIAL_AJUSTE_STATE: AjusteActionState = { result: null }

export interface CrearAjusteInput {
  usuario_id: string
  puntos: number
  motivo: string
}

const PUNTOS_MIN = -100
const PUNTOS_MAX = 100
const MOTIVO_MAX_LEN = 280

/**
 * Validates an "add manual adjustment" payload. The action layer trims
 * motivo and coerces puntos to a number before calling — this just checks
 * the resulting shape. Returns null on success, error string otherwise.
 */
export function validateCrearAjuste(input: CrearAjusteInput): string | null {
  if (!input.usuario_id) {
    return 'Falta el usuario al que se le aplica el ajuste.'
  }
  if (!Number.isInteger(input.puntos)) {
    return 'Los puntos deben ser un entero (positivo o negativo).'
  }
  if (input.puntos === 0) {
    return 'Un ajuste de 0 no hace nada.'
  }
  if (input.puntos < PUNTOS_MIN || input.puntos > PUNTOS_MAX) {
    return `Los puntos deben estar entre ${PUNTOS_MIN} y ${PUNTOS_MAX}.`
  }
  const motivoTrim = input.motivo.trim()
  if (motivoTrim.length === 0) {
    return 'El motivo es obligatorio.'
  }
  if (motivoTrim.length > MOTIVO_MAX_LEN) {
    return `El motivo no puede tener más de ${MOTIVO_MAX_LEN} caracteres.`
  }
  return null
}
