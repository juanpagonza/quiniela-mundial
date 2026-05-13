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

// Mock supabase client for `client.from(...).update(...).eq(...)`. Captures
// every chain call so tests can assert on payload + filter.
function createMockClient() {
  const eqMock = vi.fn().mockResolvedValue({ error: null })
  const updateMock = vi.fn().mockReturnValue({ eq: eqMock })
  const fromMock = vi.fn().mockReturnValue({ update: updateMock })

  return { client: { from: fromMock } as never, fromMock, updateMock, eqMock }
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

  it('updates each match by api_id with estado + scores', async () => {
    mockApi(liveMatches)
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
    const eqMock = vi
      .fn()
      .mockResolvedValueOnce({ error: { message: 'constraint X' } })
      .mockResolvedValueOnce({ error: null })
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock })
    const client = { from: () => ({ update: updateMock }) } as never

    await expect(sincronizarResultados(client)).rejects.toThrow(/constraint X/)
    // Only the first match was attempted; the second never ran.
    expect(eqMock).toHaveBeenCalledTimes(1)
  })
})
