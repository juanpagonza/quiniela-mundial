import { describe, it, expect } from 'vitest'
import {
  validateCrearPregunta,
  type CrearPreguntaInput,
} from '../preguntas-bonus-logic'

const base: CrearPreguntaInput = {
  partidoId: 'partido-1',
  tipo: 'si_no',
  enunciado: '¿Habrá penal?',
  opciones: null,
  puntos: 2,
}

describe('validateCrearPregunta', () => {
  it('returns null for a valid si_no question', () => {
    expect(validateCrearPregunta(base)).toBeNull()
  })

  it('requires a non-empty enunciado', () => {
    expect(validateCrearPregunta({ ...base, enunciado: '' })).toMatch(/enunciado/i)
    expect(validateCrearPregunta({ ...base, enunciado: '   ' })).toMatch(/enunciado/i)
  })

  it('requires puntos to be a positive integer', () => {
    expect(validateCrearPregunta({ ...base, puntos: 0 })).toMatch(/puntos/i)
    expect(validateCrearPregunta({ ...base, puntos: -1 })).toMatch(/puntos/i)
    expect(validateCrearPregunta({ ...base, puntos: 2.5 })).toMatch(/puntos/i)
  })

  it('requires a partidoId', () => {
    expect(validateCrearPregunta({ ...base, partidoId: '' })).toMatch(/partido/i)
  })

  it('opcion_multiple needs at least 2 non-empty options', () => {
    expect(
      validateCrearPregunta({
        ...base,
        tipo: 'opcion_multiple',
        opciones: null,
      }),
    ).toMatch(/opciones/i)
    expect(
      validateCrearPregunta({
        ...base,
        tipo: 'opcion_multiple',
        opciones: ['Solo una'],
      }),
    ).toMatch(/2/)
    expect(
      validateCrearPregunta({
        ...base,
        tipo: 'opcion_multiple',
        opciones: ['Brasil', '  '],
      }),
    ).toMatch(/vac/i)
  })

  it('opcion_multiple with valid options passes', () => {
    expect(
      validateCrearPregunta({
        ...base,
        tipo: 'opcion_multiple',
        opciones: ['Brasil', 'Argentina', 'Francia'],
      }),
    ).toBeNull()
  })

  it('ignores opciones for non-opcion_multiple tipos', () => {
    // Sending opciones for a si_no question is a no-op (server stores them
    // but they don't affect validation). Make sure it doesn't error.
    expect(
      validateCrearPregunta({
        ...base,
        tipo: 'si_no',
        opciones: ['anything'],
      }),
    ).toBeNull()
  })
})
