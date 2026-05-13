import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import type { ApiMatchesResponse } from './types'
import { footballFetch } from './client'
import { STATUS_TO_ESTADO } from './import-fixture'

type Client = SupabaseClient<Database>

export interface SincronizarResultadosResult {
  partidos_actualizados: number
}

/**
 * Pulls live + finished matches from football-data.org and writes back
 * estado + marcador_*_real for each one. Matched against our partidos
 * rows by api_id (the football-data identifier).
 *
 * The API filter `status=IN_PLAY,PAUSED,FINISHED` keeps the payload
 * small — programado/scheduled matches don't move on their own.
 *
 * When a match crosses into 'finalizado' the DB trigger added in Fase 5
 * will fire and recompute predicciones_partido.puntos_obtenidos. This
 * function doesn't need to know about that.
 *
 * Errors abort early: if a single update fails we surface the error
 * and stop, so the cron job logs a clear failure instead of silently
 * processing half a batch.
 */
export async function sincronizarResultados(
  client: Client,
  competitionId: string = 'WC',
): Promise<SincronizarResultadosResult> {
  const response = await footballFetch<ApiMatchesResponse>(
    `/competitions/${competitionId}/matches?status=IN_PLAY,PAUSED,FINISHED`,
  )

  let actualizados = 0
  for (const match of response.matches) {
    const { error } = await client
      .from('partidos')
      .update({
        estado: STATUS_TO_ESTADO[match.status],
        marcador_local_real: match.score.fullTime.home,
        marcador_visitante_real: match.score.fullTime.away,
      })
      .eq('api_id', match.id)

    if (error) {
      throw new Error(`Failed to update partido api_id=${match.id}: ${error.message}`)
    }
    actualizados++
  }

  return { partidos_actualizados: actualizados }
}
