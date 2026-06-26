import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sincronizarResultados } from '../sync-results'
import type { ApiMatchesResponse } from '../types'

beforeEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  vi.stubEnv('FOOTBALL_DATA_API_KEY', 'test-key')
})

function mockApi(body: ApiMatchesResponse) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, json: async () => body }),
  )
}

interface CurrentPartidoRow {
  api_id: number
  estado: string
  marcador_local_real: number | null
  marcador_visitante_real: number | null
}

// Mock supabase client. The sync now does TWO chains:
//   1. client.from('partidos').select(...).in('api_id', ids) → current state
//   2. client.from('partidos').update(...).eq('api_id', id)  → write
// `currentRows` controls what the pre-fetch returns so tests can drive both
// guards (null-score skip and admin-override skip).
function createMockClient(opts: { currentRows?: CurrentPartidoRow[] } = {}) {
  const inMock = vi
    .fn()
    .mockResolvedValue({ data: opts.currentRows ?? [], error: null })
  const selectMock = vi.fn().mockReturnValue({ in: inMock })

  const eqMock = vi.fn().mockResolvedValue({ error: null })
  const updateMock = vi.fn().mockReturnValue({ eq: eqMock })

  const fromMock = vi.fn().mockReturnValue({
    select: selectMock,
    update: updateMock,
  })

  return {
    client: { from: fromMock } as never,
    fromMock,
    selectMock,
    inMock,
    updateMock,
    eqMock,
  }
}

const liveMatches: ApiMatchesResponse = {
  count: 2,
  matches: [
    {
      id: 2001,
      utcDate: '2026-06-12T20:00:00Z',
      status: 'IN_PLAY',
      stage: 'GROUP_STAGE',
      homeTeam: { id: 10, name: 'A', shortName: 'A', tla: 'A', crest: null },
      awayTeam: { id: 20, name: 'B', shortName: 'B', tla: 'B', crest: null },
      score: {
        winner: 'HOME_TEAM',
        fullTime: { home: 1, away: 0 },
        halfTime: { home: 1, away: 0 },
      },
    },
    {
      id: 2002,
      utcDate: '2026-06-13T20:00:00Z',
      status: 'FINISHED',
      stage: 'LAST_16',
      homeTeam: { id: 30, name: 'C', shortName: 'C', tla: 'C', crest: null },
      awayTeam: { id: 40, name: 'D', shortName: 'D', tla: 'D', crest: null },
      score: {
        winner: 'AWAY_TEAM',
        fullTime: { home: 0, away: 2 },
        halfTime: { home: 0, away: 1 },
      },
    },
  ],
}

describe('sincronizarResultados', () => {
  it('fetches matches filtered by IN_PLAY, PAUSED, FINISHED', async () => {
    mockApi({ count: 0, matches: [] })
    const { client } = createMockClient()

    await sincronizarResultados(client)

    expect(fetch).toHaveBeenCalledWith(
      'https://api.football-data.org/v4/competitions/WC/matches?status=IN_PLAY,PAUSED,FINISHED',
      expect.anything(),
    )
  })

  it('accepts a custom competitionId', async () => {
    mockApi({ count: 0, matches: [] })
    const { client } = createMockClient()

    await sincronizarResultados(client, 'CL')

    expect(fetch).toHaveBeenCalledWith(
      'https://api.football-data.org/v4/competitions/CL/matches?status=IN_PLAY,PAUSED,FINISHED',
      expect.anything(),
    )
  })

  it('updates each match by api_id with estado + scores when no current rows', async () => {
    mockApi(liveMatches)
    // No current rows → guards don't trigger.
    const { client, fromMock, updateMock, eqMock } = createMockClient()

    await sincronizarResultados(client)

    expect(fromMock).toHaveBeenCalledWith('partidos')
    expect(updateMock).toHaveBeenCalledTimes(2)
    expect(eqMock).toHaveBeenCalledTimes(2)

    expect(updateMock).toHaveBeenNthCalledWith(1, {
      estado: 'en_curso',
      marcador_local_real: 1,
      marcador_visitante_real: 0,
    })
    expect(eqMock).toHaveBeenNthCalledWith(1, 'api_id', 2001)

    expect(updateMock).toHaveBeenNthCalledWith(2, {
      estado: 'finalizado',
      marcador_local_real: 0,
      marcador_visitante_real: 2,
    })
    expect(eqMock).toHaveBeenNthCalledWith(2, 'api_id', 2002)
  })

  it('returns the count of updated partidos', async () => {
    mockApi(liveMatches)
    const { client } = createMockClient()

    const result = await sincronizarResultados(client)

    expect(result).toEqual({ partidos_actualizados: 2 })
  })

  it('returns 0 when no matches are in progress', async () => {
    mockApi({ count: 0, matches: [] })
    const { client, updateMock } = createMockClient()

    const result = await sincronizarResultados(client)

    expect(result).toEqual({ partidos_actualizados: 0 })
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('propagates DB errors and stops processing', async () => {
    mockApi(liveMatches)
    const inMock = vi.fn().mockResolvedValue({ data: [], error: null })
    const selectMock = vi.fn().mockReturnValue({ in: inMock })
    const eqMock = vi
      .fn()
      .mockResolvedValueOnce({ error: { message: 'constraint X' } })
      .mockResolvedValueOnce({ error: null })
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock })
    const client = {
      from: () => ({ select: selectMock, update: updateMock }),
    } as never

    await expect(sincronizarResultados(client)).rejects.toThrow(/constraint X/)
    // Only the first match was attempted; the second never ran.
    expect(eqMock).toHaveBeenCalledTimes(1)
  })

  // ---------------------------------------------------------------------------
  // Defensive guards
  // ---------------------------------------------------------------------------

  it('Guard 1: skips a match when API reports null scores', async () => {
    const body: ApiMatchesResponse = {
      count: 1,
      matches: [
        {
          id: 3001,
          utcDate: '2026-06-12T20:00:00Z',
          status: 'FINISHED',
          stage: 'GROUP_STAGE',
          homeTeam: { id: 50, name: 'E', shortName: 'E', tla: 'E', crest: null },
          awayTeam: { id: 60, name: 'F', shortName: 'F', tla: 'F', crest: null },
          score: {
            winner: null,
            // Lagged data feed: FINISHED status but no scores published yet.
            fullTime: { home: null, away: null },
            halfTime: { home: null, away: null },
          },
        },
      ],
    }
    mockApi(body)
    const { client, updateMock } = createMockClient()

    const result = await sincronizarResultados(client)

    expect(updateMock).not.toHaveBeenCalled()
    expect(result).toEqual({ partidos_actualizados: 0 })
  })

  it('Guard 1: still writes when only one side of the score is null… NO, both must be non-null', async () => {
    const body: ApiMatchesResponse = {
      count: 1,
      matches: [
        {
          id: 3002,
          utcDate: '2026-06-12T20:00:00Z',
          status: 'FINISHED',
          stage: 'GROUP_STAGE',
          homeTeam: { id: 50, name: 'E', shortName: 'E', tla: 'E', crest: null },
          awayTeam: { id: 60, name: 'F', shortName: 'F', tla: 'F', crest: null },
          score: {
            winner: null,
            fullTime: { home: 2, away: null },
            halfTime: { home: 1, away: 0 },
          },
        },
      ],
    }
    mockApi(body)
    const { client, updateMock } = createMockClient()

    const result = await sincronizarResultados(client)

    // Either-null is treated the same as both-null: skip the update.
    expect(updateMock).not.toHaveBeenCalled()
    expect(result).toEqual({ partidos_actualizados: 0 })
  })

  it('Guard 2: skips a match already finalizado in the DB (admin override)', async () => {
    mockApi(liveMatches)
    const { client, updateMock, eqMock } = createMockClient({
      currentRows: [
        // Admin already locked this in with their own score.
        {
          api_id: 2002,
          estado: 'finalizado',
          marcador_local_real: 3,
          marcador_visitante_real: 1,
        },
        // The other partido (2001) is still en_curso in the DB,
        // so the API update IS applied to it.
        {
          api_id: 2001,
          estado: 'programado',
          marcador_local_real: null,
          marcador_visitante_real: null,
        },
      ],
    })

    const result = await sincronizarResultados(client)

    // Only partido 2001 got updated; 2002 was skipped because admin set it.
    expect(updateMock).toHaveBeenCalledTimes(1)
    expect(eqMock).toHaveBeenCalledWith('api_id', 2001)
    expect(result).toEqual({ partidos_actualizados: 1 })
  })

  it('Guard 2: still writes when DB row is finalizado but scores are null', async () => {
    // Edge case: a previous buggy sync left finalizado + null scores in
    // the DB. Don't get stuck — let the API correct it this round.
    mockApi(liveMatches)
    const { client, updateMock } = createMockClient({
      currentRows: [
        {
          api_id: 2002,
          estado: 'finalizado',
          marcador_local_real: null,
          marcador_visitante_real: null,
        },
      ],
    })

    await sincronizarResultados(client)

    // Both partidos updated: 2001 (no current row) and 2002 (current finalizado
    // but with null scores, so the override guard doesn't kick in).
    expect(updateMock).toHaveBeenCalledTimes(2)
  })
})
