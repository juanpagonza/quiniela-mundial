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

interface ExistingPartidoRow {
  api_id: number
  estado: string
  marcador_local_real: number | null
  marcador_visitante_real: number | null
}

// Helper: build a minimal Supabase-shaped client. The import does:
//   1. client.from('equipos').upsert(...).select('id, api_id')
//   2. client.from('partidos').select(...).in('api_id', ids)   ← NEW (guard)
//   3. client.from('partidos').upsert(...)
// `existingPartidos` controls what step 2 returns so tests can drive the
// finalizado-guard branch.
function createMockClient(
  equiposReturned: Array<{ id: string; api_id: number }>,
  existingPartidos: ExistingPartidoRow[] = [],
) {
  const equiposUpsert = vi.fn().mockReturnValue({
    select: vi
      .fn()
      .mockResolvedValue({ data: equiposReturned, error: null }),
  })

  const partidosIn = vi
    .fn()
    .mockResolvedValue({ data: existingPartidos, error: null })
  const partidosSelect = vi.fn().mockReturnValue({ in: partidosIn })
  const partidosUpsert = vi.fn().mockResolvedValue({ error: null })

  const from = vi.fn().mockImplementation((table: string) => {
    if (table === 'equipos') return { upsert: equiposUpsert }
    if (table === 'partidos')
      return { upsert: partidosUpsert, select: partidosSelect }
    throw new Error(`unexpected table: ${table}`)
  })

  return {
    client: { from } as never,
    equiposUpsert,
    partidosUpsert,
    partidosSelect,
    partidosIn,
    from,
  }
}

// Sample API payload: two matches between three distinct teams.
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

  it('returns counts (no existing finalizados → none omitted)', async () => {
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
      partidos_omitidos_finalizados: 0,
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
      partidos_omitidos_finalizados: 0,
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

  // ---------------------------------------------------------------------------
  // Finalizado guard
  // ---------------------------------------------------------------------------

  it('Guard: skips a partido that the DB already has as finalizado with scores', async () => {
    mockApi(sampleResponse)
    const { client, partidosUpsert } = createMockClient(
      [
        { id: 'arg', api_id: 10 },
        { id: 'bra', api_id: 20 },
        { id: 'ger', api_id: 30 },
      ],
      [
        // Match 1002 is already locked in by admin: don't let import overwrite estado.
        {
          api_id: 1002,
          estado: 'finalizado',
          marcador_local_real: 3,
          marcador_visitante_real: 1,
        },
        // Match 1001 is still scheduled — fair game for the import.
        {
          api_id: 1001,
          estado: 'programado',
          marcador_local_real: null,
          marcador_visitante_real: null,
        },
      ],
    )

    const result = await importarFixture(client)

    expect(partidosUpsert).toHaveBeenCalledOnce()
    const [rows] = partidosUpsert.mock.calls[0]
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ api_id: 1001 })

    expect(result.partidos_importados).toBe(1)
    expect(result.partidos_omitidos_finalizados).toBe(1)
    expect(result.partidos_omitidos_tbd).toBe(0)
  })

  it('Guard: does NOT skip a finalizado partido whose stored scores are null (recover from bug)', async () => {
    // Edge case: a previous buggy sync (or hand-edit) left finalizado +
    // null scores. The guard is only triggered when BOTH scores are set,
    // so the import can still correct this row.
    mockApi(sampleResponse)
    const { client, partidosUpsert } = createMockClient(
      [
        { id: 'arg', api_id: 10 },
        { id: 'bra', api_id: 20 },
        { id: 'ger', api_id: 30 },
      ],
      [
        {
          api_id: 1002,
          estado: 'finalizado',
          marcador_local_real: null,
          marcador_visitante_real: null,
        },
      ],
    )

    const result = await importarFixture(client)

    const [rows] = partidosUpsert.mock.calls[0]
    expect(rows).toHaveLength(2) // BOTH partidos go through; nothing protected.
    expect(result.partidos_omitidos_finalizados).toBe(0)
  })

  it('Guard: lets en_curso partidos flow through (only finalizado is protected)', async () => {
    mockApi(sampleResponse)
    const { client, partidosUpsert } = createMockClient(
      [
        { id: 'arg', api_id: 10 },
        { id: 'bra', api_id: 20 },
        { id: 'ger', api_id: 30 },
      ],
      [
        // Even though scores are set, the row is en_curso, so it's not the
        // admin's "this is final" signal we're protecting.
        {
          api_id: 1002,
          estado: 'en_curso',
          marcador_local_real: 1,
          marcador_visitante_real: 0,
        },
      ],
    )

    const result = await importarFixture(client)

    const [rows] = partidosUpsert.mock.calls[0]
    expect(rows).toHaveLength(2)
    expect(result.partidos_omitidos_finalizados).toBe(0)
  })
})
