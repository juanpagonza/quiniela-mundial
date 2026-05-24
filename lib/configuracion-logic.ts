export interface ConfiguracionInput {
  puntos_marcador_exacto: number
  puntos_solo_ganador: number
  puntos_campeon: number
  puntos_subcampeon: number
  puntos_goleador: number
  goleador_oficial: string | null
}

const PUNTOS_MIN = 0
const PUNTOS_MAX = 100
const GOLEADOR_MAX_LEN = 80

const PUNTOS_LABELS: Record<keyof Omit<ConfiguracionInput, 'goleador_oficial'>, string> = {
  puntos_marcador_exacto: 'marcador exacto',
  puntos_solo_ganador: 'solo ganador',
  puntos_campeon: 'campeón',
  puntos_subcampeon: 'subcampeón',
  puntos_goleador: 'goleador',
}

/**
 * Validates the configuracion update payload before it hits the DB. The
 * lock against editing puntos post-cierre is enforced by the Server Action,
 * not here — this is pure shape/range validation.
 *
 * Returns null on success, or a user-facing Spanish error string.
 */
export function validateConfiguracion(input: ConfiguracionInput): string | null {
  for (const [key, label] of Object.entries(PUNTOS_LABELS) as Array<
    [keyof typeof PUNTOS_LABELS, string]
  >) {
    const value = input[key]
    if (!Number.isInteger(value)) {
      return `Los puntos de ${label} deben ser un entero.`
    }
    if (value < PUNTOS_MIN) {
      return `Los puntos de ${label} no pueden ser negativos.`
    }
    if (value > PUNTOS_MAX) {
      return `Los puntos de ${label} no pueden ser mayores a ${PUNTOS_MAX}.`
    }
  }

  if (input.goleador_oficial != null) {
    if (input.goleador_oficial.length > GOLEADOR_MAX_LEN) {
      return `El goleador oficial no puede tener más de ${GOLEADOR_MAX_LEN} caracteres.`
    }
  }

  return null
}
