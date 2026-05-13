import { describe, it, expect, vi } from 'vitest'
import {
  upsertPrediccionPartidoCore,
  MARCADOR_MIN,
  MARCADOR_MAX,
} from '../predicciones-logic'

function createMockClient(upsertResult: { error: { code?: string; message: string } | null }) {
  const upsertMock = vi.fn().mockResolvedValue(upsertResult)
  const fromMock = vi.fn().mockReturnValue({ upsert: upsertMock })
  return { client: { from: fromMock } as never, fromMock, upsertMock }
}

const validInput = {
  partidoId: 'partido-1',
  marcadorLocal: 2,
  marcadorVisitante: 1,
}

describe('upsertPrediccionPartidoCore', () => {
  it('upserts on (usuario, partido) and returns success on a clean write', async () => {
    const { client, fromMock, upsertMock } = createMockClient({ error: null })

    const result = await upsertPrediccionPartidoCore(client, 'user-1', validInput)

    expect(result).toEqual({ success: true })
    expect(fromMock).toHaveBeenCalledWith('predicciones_partido')
    expect(upsertMock).toHaveBeenCalledWith(
      {
        usuario_id: 'user-1',
        partido_id: 'partido-1',
        marcador_local: 2,
        marcador_visitante: 1,
      },
      { onConflict: 'usuario_id,partido_id' },
    )
  })

  it('rejects a negative marcador_local without hitting the DB', async () => {
    const { client, upsertMock } = createMockClient({ error: null })

    const result = await upsertPrediccionPartidoCore(client, 'user-1', {
      ...validInput,
      marcadorLocal: -1,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toMatch(/local/i)
    }
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('rejects a negative marcador_visitante without hitting the DB', async () => {
    const { client, upsertMock } = createMockClient({ error: null })

    const result = await upsertPrediccionPartidoCore(client, 'user-1', {
      ...validInput,
      marcadorVisitante: -3,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toMatch(/visitante/i)
    }
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('rejects non-integer marcadores', async () => {
    const { client, upsertMock } = createMockClient({ error: null })

    const result = await upsertPrediccionPartidoCore(client, 'user-1', {
      ...validInput,
      marcadorLocal: 1.5,
    })

    expect(result.success).toBe(false)
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('rejects marcadores greater than the maximum', async () => {
    const { client, upsertMock } = createMockClient({ error: null })

    const result = await upsertPrediccionPartidoCore(client, 'user-1', {
      ...validInput,
      marcadorLocal: MARCADOR_MAX + 1,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toMatch(new RegExp(String(MARCADOR_MAX)))
    }
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('accepts the boundary values (0 and MAX)', async () => {
    const { client } = createMockClient({ error: null })

    const r1 = await upsertPrediccionPartidoCore(client, 'user-1', {
      ...validInput,
      marcadorLocal: MARCADOR_MIN,
      marcadorVisitante: MARCADOR_MIN,
    })
    const r2 = await upsertPrediccionPartidoCore(client, 'user-1', {
      ...validInput,
      marcadorLocal: MARCADOR_MAX,
      marcadorVisitante: MARCADOR_MAX,
    })

    expect(r1).toEqual({ success: true })
    expect(r2).toEqual({ success: true })
  })

  it('maps Postgres permission errors (42501) to "predicciones cerradas"', async () => {
    const { client } = createMockClient({
      error: { code: '42501', message: 'new row violates RLS' },
    })

    const result = await upsertPrediccionPartidoCore(client, 'user-1', validInput)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toMatch(/cerrad/i)
    }
  })

  it('propagates other DB errors with their message', async () => {
    const { client } = createMockClient({
      error: { code: '23505', message: 'duplicate key' },
    })

    const result = await upsertPrediccionPartidoCore(client, 'user-1', validInput)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('duplicate key')
    }
  })
})
