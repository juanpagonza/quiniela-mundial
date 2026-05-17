import { describe, it, expect, vi } from 'vitest'
import { upsertPrediccionTorneoCore } from '../torneo-logic'

function createMockClient(upsertResult: { error: { code?: string; message: string } | null }) {
  const upsertMock = vi.fn().mockResolvedValue(upsertResult)
  const fromMock = vi.fn().mockReturnValue({ upsert: upsertMock })
  return { client: { from: fromMock } as never, upsertMock }
}

describe('upsertPrediccionTorneoCore', () => {
  it('upserts on usuario_id with the provided picks', async () => {
    const { client, upsertMock } = createMockClient({ error: null })

    const result = await upsertPrediccionTorneoCore(client, 'user-1', {
      campeon_equipo_id: 'eq-1',
      subcampeon_equipo_id: 'eq-2',
      goleador_nombre: 'Mbappé',
    })

    expect(result).toEqual({ success: true })
    expect(upsertMock).toHaveBeenCalledWith(
      {
        usuario_id: 'user-1',
        campeon_equipo_id: 'eq-1',
        subcampeon_equipo_id: 'eq-2',
        goleador_nombre: 'Mbappé',
      },
      { onConflict: 'usuario_id' },
    )
  })

  it('allows a partial save (only campeón picked)', async () => {
    const { client, upsertMock } = createMockClient({ error: null })

    const result = await upsertPrediccionTorneoCore(client, 'user-1', {
      campeon_equipo_id: 'eq-1',
      subcampeon_equipo_id: null,
      goleador_nombre: null,
    })

    expect(result).toEqual({ success: true })
    expect(upsertMock).toHaveBeenCalled()
  })

  it('allows an empty save (no picks at all)', async () => {
    const { client } = createMockClient({ error: null })
    const result = await upsertPrediccionTorneoCore(client, 'user-1', {
      campeon_equipo_id: null,
      subcampeon_equipo_id: null,
      goleador_nombre: null,
    })
    expect(result).toEqual({ success: true })
  })

  it('rejects same equipo for campeón and subcampeón', async () => {
    const { client, upsertMock } = createMockClient({ error: null })

    const result = await upsertPrediccionTorneoCore(client, 'user-1', {
      campeon_equipo_id: 'eq-1',
      subcampeon_equipo_id: 'eq-1',
      goleador_nombre: 'Mbappé',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toMatch(/mismo equipo|distintos?|campe[óo]n/i)
    }
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('trims goleador_nombre and stores null when only whitespace', async () => {
    const { client, upsertMock } = createMockClient({ error: null })
    await upsertPrediccionTorneoCore(client, 'user-1', {
      campeon_equipo_id: null,
      subcampeon_equipo_id: null,
      goleador_nombre: '   ',
    })
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ goleador_nombre: null }),
      expect.anything(),
    )
  })

  it('trims surrounding whitespace from goleador_nombre', async () => {
    const { client, upsertMock } = createMockClient({ error: null })
    await upsertPrediccionTorneoCore(client, 'user-1', {
      campeon_equipo_id: null,
      subcampeon_equipo_id: null,
      goleador_nombre: '  Messi  ',
    })
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ goleador_nombre: 'Messi' }),
      expect.anything(),
    )
  })

  it('maps Postgres 42501 to "quiniela cerrada"', async () => {
    const { client } = createMockClient({
      error: { code: '42501', message: 'rls' },
    })

    const result = await upsertPrediccionTorneoCore(client, 'user-1', {
      campeon_equipo_id: 'eq-1',
      subcampeon_equipo_id: 'eq-2',
      goleador_nombre: null,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toMatch(/cerrad/i)
    }
  })

  it('propagates other DB errors with their message', async () => {
    const { client } = createMockClient({
      error: { code: '23503', message: 'fk violation' },
    })
    const result = await upsertPrediccionTorneoCore(client, 'user-1', {
      campeon_equipo_id: 'eq-1',
      subcampeon_equipo_id: 'eq-2',
      goleador_nombre: null,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('fk violation')
    }
  })
})
