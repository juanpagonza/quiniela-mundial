import { describe, it, expect } from 'vitest'
import {
  validateConfiguracion,
  type ConfiguracionInput,
} from '../configuracion-logic'

const base: ConfiguracionInput = {
  puntos_marcador_exacto: 5,
  puntos_solo_ganador: 2,
  puntos_campeon: 10,
  puntos_subcampeon: 5,
  puntos_goleador: 10,
  goleador_oficial: null,
}

describe('validateConfiguracion', () => {
  it('returns null for valid input', () => {
    expect(validateConfiguracion(base)).toBeNull()
  })

  it('allows zero on any puntos field (admin can disable a category)', () => {
    expect(
      validateConfiguracion({ ...base, puntos_marcador_exacto: 0 }),
    ).toBeNull()
    expect(
      validateConfiguracion({ ...base, puntos_goleador: 0 }),
    ).toBeNull()
  })

  it('rejects negative puntos', () => {
    expect(
      validateConfiguracion({ ...base, puntos_marcador_exacto: -1 }),
    ).toMatch(/marcador exacto/i)
    expect(
      validateConfiguracion({ ...base, puntos_solo_ganador: -5 }),
    ).toMatch(/ganador/i)
  })

  it('rejects non-integer puntos', () => {
    expect(
      validateConfiguracion({ ...base, puntos_campeon: 2.5 }),
    ).toMatch(/entero/i)
  })

  it('rejects nullish goleador_oficial as empty string (forces null)', () => {
    // The action coerces "" → null before calling validator, so validator
    // sees null. We test both shapes are accepted via the validator.
    expect(
      validateConfiguracion({ ...base, goleador_oficial: null }),
    ).toBeNull()
    expect(
      validateConfiguracion({ ...base, goleador_oficial: 'Mbappé' }),
    ).toBeNull()
  })

  it('rejects goleador_oficial longer than 80 chars', () => {
    expect(
      validateConfiguracion({
        ...base,
        goleador_oficial: 'A'.repeat(81),
      }),
    ).toMatch(/80/)
  })

  it('caps puntos at a sane maximum (100) to catch typos like 1000', () => {
    expect(
      validateConfiguracion({ ...base, puntos_marcador_exacto: 101 }),
    ).toMatch(/100/)
  })
})
