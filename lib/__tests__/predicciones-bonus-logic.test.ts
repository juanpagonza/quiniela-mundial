import { describe, it, expect, vi } from 'vitest'
import { upsertPrediccionBonusCore } from '../predicciones-bonus-logic'

function createMockClient(upsertResult: { error: { code?: string; message: string } | null }) {
  const upsertMock = vi.fn().mockResolvedValue(upsertResult)
  const fromMock = vi.fn().mockReturnValue({ upsert: upsertMock })
  return { client: { from: fromMock } as never, fromMock, upsertMock }
}

describe('upsertPrediccionBonusCore', () => {
  describe('tipo: numero', () => {
    it('accepts a non-negative integer and stores it as JSON number', async () => {
      const { client, upsertMock } = createMockClient({ error: null })

      const result = await upsertPrediccionBonusCore(client, 'user-1', {
        preguntaBonusId: 'q-1',
        tipo: 'numero',
        respuesta: 3,
      })

      expect(result).toEqual({ success: true })
      expect(upsertMock).toHaveBeenCalledWith(
        {
          usuario_id: 'user-1',
          pregunta_bonus_id: 'q-1',
          respuesta: 3,
        },
        { onConflict: 'usuario_id,pregunta_bonus_id' },
      )
    })

    it('accepts 0', async () => {
      const { client } = createMockClient({ error: null })
      const result = await upsertPrediccionBonusCore(client, 'user-1', {
        preguntaBonusId: 'q-1',
        tipo: 'numero',
        respuesta: 0,
      })
      expect(result).toEqual({ success: true })
    })

    it('rejects negative numbers', async () => {
      const { client, upsertMock } = createMockClient({ error: null })
      const result = await upsertPrediccionBonusCore(client, 'user-1', {
        preguntaBonusId: 'q-1',
        tipo: 'numero',
        respuesta: -1,
      })
      expect(result.success).toBe(false)
      expect(upsertMock).not.toHaveBeenCalled()
    })

    it('rejects NaN', async () => {
      const { client, upsertMock } = createMockClient({ error: null })
      const result = await upsertPrediccionBonusCore(client, 'user-1', {
        preguntaBonusId: 'q-1',
        tipo: 'numero',
        respuesta: NaN,
      })
      expect(result.success).toBe(false)
      expect(upsertMock).not.toHaveBeenCalled()
    })

    it('rejects string when tipo is numero', async () => {
      const { client, upsertMock } = createMockClient({ error: null })
      const result = await upsertPrediccionBonusCore(client, 'user-1', {
        preguntaBonusId: 'q-1',
        tipo: 'numero',
        respuesta: '3' as unknown as number,
      })
      expect(result.success).toBe(false)
      expect(upsertMock).not.toHaveBeenCalled()
    })
  })

  describe('tipo: over_under', () => {
    it('accepts "over"', async () => {
      const { client, upsertMock } = createMockClient({ error: null })
      const result = await upsertPrediccionBonusCore(client, 'user-1', {
        preguntaBonusId: 'q-1',
        tipo: 'over_under',
        respuesta: 'over',
      })
      expect(result).toEqual({ success: true })
      expect(upsertMock).toHaveBeenCalledWith(
        expect.objectContaining({ respuesta: 'over' }),
        expect.anything(),
      )
    })

    it('accepts "under"', async () => {
      const { client } = createMockClient({ error: null })
      const result = await upsertPrediccionBonusCore(client, 'user-1', {
        preguntaBonusId: 'q-1',
        tipo: 'over_under',
        respuesta: 'under',
      })
      expect(result).toEqual({ success: true })
    })

    it('rejects other strings', async () => {
      const { client, upsertMock } = createMockClient({ error: null })
      const result = await upsertPrediccionBonusCore(client, 'user-1', {
        preguntaBonusId: 'q-1',
        tipo: 'over_under',
        respuesta: 'maybe',
      })
      expect(result.success).toBe(false)
      expect(upsertMock).not.toHaveBeenCalled()
    })
  })

  describe('tipo: si_no', () => {
    it('accepts "si"', async () => {
      const { client } = createMockClient({ error: null })
      const result = await upsertPrediccionBonusCore(client, 'user-1', {
        preguntaBonusId: 'q-1',
        tipo: 'si_no',
        respuesta: 'si',
      })
      expect(result).toEqual({ success: true })
    })

    it('accepts "no"', async () => {
      const { client } = createMockClient({ error: null })
      const result = await upsertPrediccionBonusCore(client, 'user-1', {
        preguntaBonusId: 'q-1',
        tipo: 'si_no',
        respuesta: 'no',
      })
      expect(result).toEqual({ success: true })
    })

    it('rejects other strings', async () => {
      const { client } = createMockClient({ error: null })
      const result = await upsertPrediccionBonusCore(client, 'user-1', {
        preguntaBonusId: 'q-1',
        tipo: 'si_no',
        respuesta: 'maybe',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('tipo: opcion_multiple', () => {
    it('accepts a string when no opciones are specified (server trusts the client)', async () => {
      const { client } = createMockClient({ error: null })
      const result = await upsertPrediccionBonusCore(client, 'user-1', {
        preguntaBonusId: 'q-1',
        tipo: 'opcion_multiple',
        respuesta: 'Brasil',
      })
      expect(result).toEqual({ success: true })
    })

    it('accepts when respuesta is in opciones', async () => {
      const { client } = createMockClient({ error: null })
      const result = await upsertPrediccionBonusCore(client, 'user-1', {
        preguntaBonusId: 'q-1',
        tipo: 'opcion_multiple',
        respuesta: 'Brasil',
        opciones: ['Brasil', 'Argentina', 'Francia'],
      })
      expect(result).toEqual({ success: true })
    })

    it('rejects when respuesta is not in opciones', async () => {
      const { client, upsertMock } = createMockClient({ error: null })
      const result = await upsertPrediccionBonusCore(client, 'user-1', {
        preguntaBonusId: 'q-1',
        tipo: 'opcion_multiple',
        respuesta: 'España',
        opciones: ['Brasil', 'Argentina', 'Francia'],
      })
      expect(result.success).toBe(false)
      expect(upsertMock).not.toHaveBeenCalled()
    })

    it('rejects empty string', async () => {
      const { client } = createMockClient({ error: null })
      const result = await upsertPrediccionBonusCore(client, 'user-1', {
        preguntaBonusId: 'q-1',
        tipo: 'opcion_multiple',
        respuesta: '',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('error mapping', () => {
    it('maps Postgres 42501 to "predicciones cerradas"', async () => {
      const { client } = createMockClient({
        error: { code: '42501', message: 'rls violation' },
      })
      const result = await upsertPrediccionBonusCore(client, 'user-1', {
        preguntaBonusId: 'q-1',
        tipo: 'si_no',
        respuesta: 'si',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toMatch(/cerrad/i)
      }
    })

    it('propagates other DB errors with their message', async () => {
      const { client } = createMockClient({
        error: { code: '23505', message: 'duplicate' },
      })
      const result = await upsertPrediccionBonusCore(client, 'user-1', {
        preguntaBonusId: 'q-1',
        tipo: 'si_no',
        respuesta: 'si',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('duplicate')
      }
    })
  })
})
