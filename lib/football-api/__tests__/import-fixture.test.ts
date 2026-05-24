import { describe, it, expect, vi, beforeEach } from 'vitest'
import { importarFixture } from '../import-fixture'
import type { ApiMatchesResponse } from '../types'

beforeEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  vi.stubEnv('FOOTBALL_DATA_API_KEY', 'test-key')
})

// Helper: build a fetch mock that returns the given API response body.
function mockApi(body: ApiMatchesResponse) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, json: async () => body }),
  )
}

// Helper: build a minimal Supabase-shaped client that records upsert calls and
// returns the inserted equipos so the partidos step can read their ids.
function createMockClient(equiposReturned: Array<{ id: string; api_id: number }>) {
  const equiposUpsert = vi.fn().mockReturnValue({
    select: vi
      .fn()
      .mockResolvedValue({ data: equiposReturned, error: null }),
  })
  const partidosUpsert = vi.fn().mockResolvedValue({ error: null })

  const from = vi.fn().mockImplementation((table: string) => {
    if (table === 'equipos') return { upsert: equiposUpsert }
    if (table === 'partidos') return { upsert: partidosUpsert }
    throw new Error(`unexpected table: ${table}`)
  })

  return { client: { from } as never, equiposUpsert, partidosUpsert, from }
}

// Sample API payload: two matches between three distinct teams. Includes a finalized
// match (so we can later assert that scores are NOT touched by import-fixture).
const sampleResponse: ApiMatchesResponse = {
  count: 2,
  matches: [
    {
      id: 1001,
      utcDate: '2026-06-12T20:00:00Z',
      status: 'SCHEDULED',
      stage: 'GROUP_STAGE',
      homeTeam: { id: 10, name: 'Argentina', shortName: 'ARG', tla: 'ARG', crest: null },
      awayTeam: { id: 20, name: 'Brazil', shortName: 'BRA', tla: 'BRA', crest: null },
      score: {
        winner: null,
        fullTime: { home: null, away: null },
        halfTime: { home: null, away: null },
      },
    },
    {
      id: 1002,
      utcDate: '2026-06-13T15:00:00Z',
      status: 'FINISHED',
      stage: 'LAST_16',
      homeTeam: { id: 30, name: 'Germany', shortName: 'GER', tla: 'GER', crest: null },
      awayTeam: { id: 10, name: 'Argentina', shortName: 'ARG', tla: 'ARG', crest: null },
      score: {
        winner: 'AWAY_TEAM',
        fullTime: { home: 1, away: 2 },
        halfTime: { home: 0, away: 1 },
      },
    },
  ],
}

describe('importarFixture', () => {
  it('hits /competitions/WC/matches by default', async () => {
    mockApi({ count: 0, matches: [] })
    const { client } = createMockClient([])

    await importarFixture(client)

    expect(fetch).toHaveBeenCalledWith(
      'https://api.football-data.org/v4/competitions/WC/matches',
      expect.anything(),
    )
  })

  it('accepts a custom competitionId', async () => {
    mockApi({ count: 0, matches: [] })
    const { client } = createMockClient([])

    await importarFixture(client, 'CL')

    expect(fetch).toHaveBeenCalledWith(
      'https://api.football-data.org/v4/competitions/CL/matches',
      expect.anything(),
    )
  })

  it('upserts each unique team once, by api_id', async () => {
    mockApi(sampleResponse)
    const { client, equiposUpsert } = createMockClient([
      { id: 'arg', api_id: 10 },
      { id: 'bra', api_id: 20 },
      { id: 'ger', api_id: 30 },
    ])

    await importarFixture(client)

    expect(equiposUpsert).toHaveBeenCalledOnce()
    const [rows, options] = equiposUpsert.mock.calls[0]
    expect(options).toMatchObject({ onConflict: 'api_id' })
    expect(rows).toHaveLength(3) // Argentina, Brazil, Germany (Argentina dedup'd)
    expect(rows).toContainEqual(
      expect.objectContaining({ api_id: 10, nombre: 'Argentina' }),
    )
    expect(rows).toContainEqual(
      expect.objectContaining({ api_id: 20, nombre: 'Brazil' }),
    )
    expect(rows).toContainEqual(
      expect.objectContaining({ api_id: 30, nombre: 'Germany' }),
    )
  })

  it('upserts each match by api_id, mapping fase and estado', async () => {
    mockApi(sampleResponse)
    const { client, partidosUpsert } = createMockClient([
      { id: 'arg', api_id: 10 },
      { id: 'bra', api_id: 20 },
      { id: 'ger', api_id: 30 },
    ])

    await importarFixture(client)

    expect(partidosUpsert).toHaveBeenCalledOnce()
    const [rows, options] = partidosUpsert.mock.calls[0]
    expect(options).toMatchObject({ onConflict: 'api_id' })
    expect(rows).toHaveLength(2)

    const match1 = rows.find((r: { api_id: number }) => r.api_id === 1001)
    expect(match1).toMatchObject({
      equipo_local_id: 'arg',
      equipo_visitante_id: 'bra',
      fase: 'grupos',
      estado: 'programado',
      fecha_hora_kickoff: '2026-06-12T20:00:00Z',
    })

    const match2 = rows.find((r: { api_id: number }) => r.api_id === 1002)
    expect(match2).toMatchObject({
      equipo_local_id: 'ger',
      equipo_visitante_id: 'arg',
      fase: 'octavos',
      estado: 'finalizado',
    })
  })

  it('does not include marcador_*_real in the partidos upsert (sync-results owns scores)', async () => {
    mockApi(sampleResponse)
    const { client, partidosUpsert } = createMockClient([
      { id: 'arg', api_id: 10 },
      { id: 'bra', api_id: 20 },
      { id: 'ger', api_id: 30 },
    ])

    await importarFixture(client)

    const [rows] = partidosUpsert.mock.calls[0]
    for (const row of rows) {
      expect(row).not.toHaveProperty('marcador_local_real')
      expect(row).not.toHaveProperty('marcador_visitante_real')
      expect(row).not.toHaveProperty('habilitado_para_predecir')
    }
  })

  it('returns counts', async () => {
    mockApi(sampleResponse)
    const { client } = createMockClient([
      { id: 'arg', api_id: 10 },
      { id: 'bra', api_id: 20 },
      { id: 'ger', api_id: 30 },
    ])

    const result = await importarFixture(client)

    expect(result).toEqual({
      equipos_importados: 3,
      partidos_importados: 2,
      partidos_omitidos_tbd: 0,
    })
  })

  it('skips matches with TBD teams (placeholder { id: null, name: null })', async () => {
    // Simulates the World Cup 2026 case where some playoff slots haven't
    // been filled yet. Football-data.org returns the match with a fully-null
    // team object — we should silently skip those matches AND not try to
    // upsert a "null" team into equipos.
    mockApi({
      count: 2,
      matches: [
        {
          id: 1001,
          utcDate: '2026-06-11T20:00:00Z',
          status: 'TIMED',
          stage: 'GROUP_STAGE',
          homeTeam: { id: 10, name: 'Argentina', shortName: 'ARG', tla: 'ARG', crest: null },
          awayTeam: { id: 20, name: 'Brazil', shortName: 'BRA', tla: 'BRA', crest: null },
          score: { winner: null, fullTime: { home: null, away: null }, halfTime: { home: null, away: null } },
        },
        {
          id: 1002,
          utcDate: '2026-06-12T20:00:00Z',
          status: 'TIMED',
          stage: 'GROUP_STAGE',
          homeTeam: { id: 10, name: 'Argentina', shortName: 'ARG', tla: 'ARG', crest: null },
          // TBD slot — comes back as all-null from the API.
          awayTeam: { id: null, name: null, shortName: null, tla: null, crest: null },
          score: { winner: null, fullTime: { home: null, away: null }, halfTime: { home: null, away: null } },
        },
      ],
    })
    const { client } = createMockClient([
      { id: 'arg', api_id: 10 },
      { id: 'bra', api_id: 20 },
    ])

    const result = await importarFixture(client)

    expect(result).toEqual({
      equipos_importados: 2,
      partidos_importados: 1,
      partidos_omitidos_tbd: 1,
    })
  })

  it('is idempotent across runs (relies on onConflict + UNIQUE constraint)', async () => {
    // Same API response is fetched twice. Each call should produce the same
    // upsert payload, and rely on the DB-level UNIQUE(api_id) for dedup.
    mockApi(sampleResponse)
    const { client, equiposUpsert, partidosUpsert } = createMockClient([
      { id: 'arg', api_id: 10 },
      { id: 'bra', api_id: 20 },
      { id: 'ger', api_id: 30 },
    ])

    await importarFixture(client)
    await importarFixture(client)

    expect(equiposUpsert).toHaveBeenCalledTimes(2)
    expect(partidosUpsert).toHaveBeenCalledTimes(2)
    expect(equiposUpsert.mock.calls[0][0]).toEqual(equiposUpsert.mock.calls[1][0])
    expect(partidosUpsert.mock.calls[0][0]).toEqual(partidosUpsert.mock.calls[1][0])
  })

  it('propagates errors from the equipos upsert', async () => {
    mockApi(sampleResponse)
    const equiposUpsert = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } }),
    })
    const partidosUpsert = vi.fn()
    const client = {
      from: (table: string) =>
        table === 'equipos' ? { upsert: equiposUpsert } : { upsert: partidosUpsert },
    } as never

    await expect(importarFixture(client)).rejects.toThrow(/boom/)
    expect(partidosUpsert).not.toHaveBeenCalled()
  })
})
