import { describe, expect, it } from 'vitest'
import { filtrarBonusPendientes } from '@/lib/queries/preguntas-bonus'

const baseEquipos = {
  equipo_local: { nombre: 'Argentina', codigo_pais: 'ar' },
  equipo_visitante: { nombre: 'Brasil', codigo_pais: 'br' },
}

function makePregunta(
  id: string,
  kickoff: string,
  overrides: {
    habilitado?: boolean
    partido?: null
    enunciado?: string
    partidoId?: string
  } = {},
) {
  if (overrides.partido === null) {
    return { id, enunciado: overrides.enunciado ?? `Pregunta ${id}`, partido: null }
  }
  return {
    id,
    enunciado: overrides.enunciado ?? `Pregunta ${id}`,
    partido: {
      id: overrides.partidoId ?? `partido-${id}`,
      fecha_hora_kickoff: kickoff,
      habilitado_para_predecir: overrides.habilitado ?? true,
      ...baseEquipos,
    },
  }
}

describe('filtrarBonusPendientes', () => {
  // Cutoff is "now + 1 minute" expressed as ISO; we hard-code a stable value
  // and pick kickoff strings relative to it.
  const CUTOFF = '2026-06-13T12:00:00.000Z'
  const KICKOFF_PAST = '2026-06-13T11:30:00.000Z'
  const KICKOFF_TOO_CLOSE = '2026-06-13T11:59:00.000Z'
  const KICKOFF_OPEN_SOON = '2026-06-13T13:00:00.000Z'
  const KICKOFF_OPEN_LATER = '2026-06-14T18:00:00.000Z'
  const KICKOFF_OPEN_LATEST = '2026-06-15T20:30:00.000Z'

  it('returns an empty list when there are no questions', () => {
    expect(filtrarBonusPendientes([], [], CUTOFF)).toEqual([])
  })

  it('drops questions the user already answered', () => {
    const preguntas = [
      makePregunta('q1', KICKOFF_OPEN_SOON),
      makePregunta('q2', KICKOFF_OPEN_LATER),
    ]
    const result = filtrarBonusPendientes(preguntas, ['q1'], CUTOFF)
    expect(result.map((p) => p.pregunta_bonus_id)).toEqual(['q2'])
  })

  it('drops questions whose partido has kickoff at or before the cutoff', () => {
    const preguntas = [
      makePregunta('past', KICKOFF_PAST),
      makePregunta('close', KICKOFF_TOO_CLOSE),
      makePregunta('open', KICKOFF_OPEN_SOON),
    ]
    const result = filtrarBonusPendientes(preguntas, [], CUTOFF)
    expect(result.map((p) => p.pregunta_bonus_id)).toEqual(['open'])
  })

  it('drops questions whose partido is not enabled for predictions', () => {
    const preguntas = [
      makePregunta('disabled', KICKOFF_OPEN_SOON, { habilitado: false }),
      makePregunta('enabled', KICKOFF_OPEN_LATER, { habilitado: true }),
    ]
    const result = filtrarBonusPendientes(preguntas, [], CUTOFF)
    expect(result.map((p) => p.pregunta_bonus_id)).toEqual(['enabled'])
  })

  it('drops questions with no embedded partido (defensive against odd joins)', () => {
    const preguntas = [
      makePregunta('orphan', KICKOFF_OPEN_SOON, { partido: null }),
      makePregunta('ok', KICKOFF_OPEN_LATER),
    ]
    const result = filtrarBonusPendientes(preguntas, [], CUTOFF)
    expect(result.map((p) => p.pregunta_bonus_id)).toEqual(['ok'])
  })

  it('sorts the remaining list by kickoff ASC so most urgent comes first', () => {
    const preguntas = [
      makePregunta('later', KICKOFF_OPEN_LATER),
      makePregunta('latest', KICKOFF_OPEN_LATEST),
      makePregunta('soon', KICKOFF_OPEN_SOON),
    ]
    const result = filtrarBonusPendientes(preguntas, [], CUTOFF)
    expect(result.map((p) => p.pregunta_bonus_id)).toEqual([
      'soon',
      'later',
      'latest',
    ])
  })

  it('returns the full denormalized shape with equipos info', () => {
    const preguntas = [
      makePregunta('q1', KICKOFF_OPEN_SOON, {
        enunciado: '¿Habrá penal?',
        partidoId: 'p-42',
      }),
    ]
    const result = filtrarBonusPendientes(preguntas, [], CUTOFF)
    expect(result).toEqual([
      {
        pregunta_bonus_id: 'q1',
        partido_id: 'p-42',
        enunciado: '¿Habrá penal?',
        equipo_local_nombre: 'Argentina',
        equipo_visitante_nombre: 'Brasil',
        equipo_local_codigo_pais: 'ar',
        equipo_visitante_codigo_pais: 'br',
        fecha_hora_kickoff: KICKOFF_OPEN_SOON,
      },
    ])
  })
})
