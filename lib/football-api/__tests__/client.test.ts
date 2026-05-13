import { describe, it, expect, vi, beforeEach } from 'vitest'
import { footballFetch, FootballApiError } from '../client'

beforeEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('footballFetch', () => {
  it('sends the X-Auth-Token header from FOOTBALL_DATA_API_KEY', async () => {
    vi.stubEnv('FOOTBALL_DATA_API_KEY', 'test-key-123')
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    })
    vi.stubGlobal('fetch', mockFetch)

    await footballFetch('/competitions/WC/matches')

    expect(mockFetch).toHaveBeenCalledOnce()
    const [, init] = mockFetch.mock.calls[0]
    expect(init.headers).toMatchObject({ 'X-Auth-Token': 'test-key-123' })
  })

  it('hits the v4 base URL', async () => {
    vi.stubEnv('FOOTBALL_DATA_API_KEY', 'any')
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', mockFetch)

    await footballFetch('/competitions/WC/matches')

    const [url] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.football-data.org/v4/competitions/WC/matches')
  })

  it('returns the parsed JSON body on success', async () => {
    vi.stubEnv('FOOTBALL_DATA_API_KEY', 'any')
    const body = { count: 1, matches: [{ id: 99 }] }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => body }))

    const result = await footballFetch('/anything')

    expect(result).toEqual(body)
  })

  it('throws FootballApiError when response is not ok', async () => {
    vi.stubEnv('FOOTBALL_DATA_API_KEY', 'any')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => '{"message":"Too many requests"}',
      }),
    )

    await expect(footballFetch('/anything')).rejects.toBeInstanceOf(FootballApiError)
    await expect(footballFetch('/anything')).rejects.toMatchObject({ status: 429 })
  })

  it('throws when FOOTBALL_DATA_API_KEY is missing', async () => {
    vi.stubEnv('FOOTBALL_DATA_API_KEY', '')
    vi.stubGlobal('fetch', vi.fn())

    await expect(footballFetch('/anything')).rejects.toThrow(/FOOTBALL_DATA_API_KEY/)
  })
})
