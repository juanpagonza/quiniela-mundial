import { describe, it, expect } from 'vitest'
import {
  validateCrearAjuste,
  type CrearAjusteInput,
} from '../ajustes-logic'

const base: CrearAjusteInput = {
  usuario_id: 'user-1',
  puntos: 5,
  motivo: 'Bonus por ganador exacto',
}

describe('validateCrearAjuste', () => {
  it('returns null for valid positive adjustment', () => {
    expect(validateCrearAjuste(base)).toBeNull()
  })

  it('accepts negative puntos (penalty)', () => {
    expect(validateCrearAjuste({ ...base, puntos: -3 })).toBeNull()
  })

  it('rejects zero (no-op)', () => {
    expect(validateCrearAjuste({ ...base, puntos: 0 })).toMatch(/cero|0/i)
  })

  it('rejects non-integer puntos', () => {
    expect(validateCrearAjuste({ ...base, puntos: 1.5 })).toMatch(/entero/i)
  })

  it('rejects puntos outside [-100, 100]', () => {
    expect(validateCrearAjuste({ ...base, puntos: 101 })).toMatch(/100/)
    expect(validateCrearAjuste({ ...base, puntos: -101 })).toMatch(/100/)
  })

  it('requires non-empty motivo', () => {
    expect(validateCrearAjuste({ ...base, motivo: '' })).toMatch(/motivo/i)
    expect(validateCrearAjuste({ ...base, motivo: '   ' })).toMatch(/motivo/i)
  })

  it('rejects motivo longer than 280 chars', () => {
    expect(
      validateCrearAjuste({ ...base, motivo: 'A'.repeat(281) }),
    ).toMatch(/280/)
  })

  it('requires usuario_id', () => {
    expect(validateCrearAjuste({ ...base, usuario_id: '' })).toMatch(/usuario/i)
  })
})
