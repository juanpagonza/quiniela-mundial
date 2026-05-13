import { describe, it, expect } from 'vitest'
import { formatearKickoff, tiempoHastaKickoff, estaBloqueado } from '../dates'

// Vitest is configured with TZ=UTC (vitest.config.ts), so dates below format
// in UTC and the day/month tokens are stable across machines.

describe('formatearKickoff', () => {
  it('produces "Día N Mes, HH:mm (tu hora)" in Spanish', () => {
    // 2026-06-16 is a Tuesday → "Mar"
    const result = formatearKickoff('2026-06-16T14:00:00Z')
    expect(result).toBe('Mar 16 Jun, 14:00 (tu hora)')
  })

  it('uses 24h clock with leading zero on minutes', () => {
    const result = formatearKickoff('2026-06-16T09:05:00Z')
    expect(result).toContain('09:05')
  })

  it('accepts a Date object', () => {
    const result = formatearKickoff(new Date('2026-06-16T14:00:00Z'))
    expect(result).toBe('Mar 16 Jun, 14:00 (tu hora)')
  })

  it('capitalizes the day and month abbreviations', () => {
    const result = formatearKickoff('2026-06-21T20:00:00Z') // Sunday in June
    // First letter of "dom" should be capital; "Jun" capital.
    expect(result).toMatch(/^Dom \d+ Jun/)
  })
})

describe('tiempoHastaKickoff', () => {
  const ahora = new Date('2026-06-16T14:00:00Z')

  it('formats hours and minutes when more than an hour away', () => {
    expect(
      tiempoHastaKickoff('2026-06-16T16:15:00Z', ahora),
    ).toBe('2h 15min')
  })

  it('drops the minutes when they are zero', () => {
    expect(
      tiempoHastaKickoff('2026-06-16T17:00:00Z', ahora),
    ).toBe('3h')
  })

  it('formats minutes only when under an hour', () => {
    expect(
      tiempoHastaKickoff('2026-06-16T14:30:00Z', ahora),
    ).toBe('30min')
  })

  it('formats "Faltan Xs" when under a minute', () => {
    expect(
      tiempoHastaKickoff('2026-06-16T14:00:30Z', ahora),
    ).toBe('Faltan 30s')
  })

  it('formats "Empezó hace Xmin" when minutes have passed', () => {
    expect(
      tiempoHastaKickoff('2026-06-16T13:55:00Z', ahora),
    ).toBe('Empezó hace 5min')
  })

  it('formats "Empezó hace Xh" when more than an hour has passed', () => {
    expect(
      tiempoHastaKickoff('2026-06-16T12:00:00Z', ahora),
    ).toBe('Empezó hace 2h')
  })

  it('formats "Empezó hace pocos segundos" when under a minute past', () => {
    expect(
      tiempoHastaKickoff('2026-06-16T13:59:45Z', ahora),
    ).toBe('Empezó hace pocos segundos')
  })

  it('formats days when more than 24h away', () => {
    expect(
      tiempoHastaKickoff('2026-06-19T14:00:00Z', ahora),
    ).toBe('3d')
  })

  it('uses the current real time when ahora is not provided', () => {
    // Provide a kickoff that is definitely in the future — anything starting
    // with "Falt" or "h" or "min" or "d" is acceptable as long as it is not
    // an "Empezó hace" string.
    const farFuture = new Date(Date.now() + 24 * 3600_000)
    const result = tiempoHastaKickoff(farFuture)
    expect(result).not.toMatch(/^Empezó/)
  })
})

describe('estaBloqueado', () => {
  const ahora = new Date('2026-06-16T14:00:00Z')

  it('true when kickoff is within 1 minute', () => {
    expect(
      estaBloqueado('2026-06-16T14:00:30Z', ahora),
    ).toBe(true)
  })

  it('true exactly at the 1-minute boundary', () => {
    expect(
      estaBloqueado('2026-06-16T14:01:00Z', ahora),
    ).toBe(true)
  })

  it('false when kickoff is more than 1 minute away', () => {
    expect(
      estaBloqueado('2026-06-16T14:01:30Z', ahora),
    ).toBe(false)
  })

  it('true when kickoff is in the past', () => {
    expect(
      estaBloqueado('2026-06-16T13:00:00Z', ahora),
    ).toBe(true)
  })

  it('uses the current real time when ahora is not provided', () => {
    const farFuture = new Date(Date.now() + 24 * 3600_000)
    expect(estaBloqueado(farFuture)).toBe(false)
    const past = new Date(Date.now() - 1000)
    expect(estaBloqueado(past)).toBe(true)
  })
})
