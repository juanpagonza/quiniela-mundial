const BASE_URL = 'https://api.football-data.org/v4'

export class FootballApiError extends Error {
  readonly status: number
  readonly body: string | null

  constructor(status: number, body: string | null) {
    super(`football-data.org responded ${status}`)
    this.name = 'FootballApiError'
    this.status = status
    this.body = body
  }
}

export async function footballFetch<T = unknown>(path: string): Promise<T> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY
  if (!apiKey) {
    throw new Error('FOOTBALL_DATA_API_KEY is not set')
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { 'X-Auth-Token': apiKey },
  })

  if (!response.ok) {
    const body = await response.text().catch(() => null)
    throw new FootballApiError(response.status, body)
  }

  return (await response.json()) as T
}
