import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type { EquipoMini } from './partidos'

type Client = SupabaseClient<Database>

export interface MiTorneo {
  campeon_equipo_id: string | null
  subcampeon_equipo_id: string | null
  goleador_nombre: string | null
  puntos_campeon: number
  puntos_subcampeon: number
  puntos_goleador: number
}

export interface TorneoDeOtro {
  usuario_id: string
  nombre: string
  foto_url: string | null
  campeon: EquipoMini | null
  subcampeon: EquipoMini | null
  goleador_nombre: string | null
  puntos_campeon: number
  puntos_subcampeon: number
  puntos_goleador: number
}

/** Catálogo completo de equipos para los selects del formulario. */
export async function obtenerEquiposParaTorneo(
  supabase: Client,
): Promise<EquipoMini[]> {
  const { data, error } = await supabase
    .from('equipos')
    .select('id, nombre, codigo_pais')
    .order('nombre', { ascending: true })
  if (error) throw error
  return data ?? []
}

/** Mi fila en predicciones_torneo (puede no existir todavía). */
export async function obtenerMiTorneo(
  supabase: Client,
  userId: string,
): Promise<MiTorneo | null> {
  const { data, error } = await supabase
    .from('predicciones_torneo')
    .select(
      `campeon_equipo_id, subcampeon_equipo_id, goleador_nombre,
       puntos_campeon, puntos_subcampeon, puntos_goleador`,
    )
    .eq('usuario_id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}

/**
 * Predicciones de torneo de todos los usuarios (incluido yo). RLS solo
 * habilita esta lectura post-cierre — el caller decide cuándo invocarla
 * pasando mundial_iniciado por adelantado.
 */
export async function obtenerTorneoDeTodos(
  supabase: Client,
): Promise<TorneoDeOtro[]> {
  const { data, error } = await supabase
    .from('predicciones_torneo')
    .select(
      `usuario_id, goleador_nombre,
       puntos_campeon, puntos_subcampeon, puntos_goleador,
       usuario:usuarios!usuario_id (nombre, foto_url),
       campeon:equipos!campeon_equipo_id (id, nombre, codigo_pais),
       subcampeon:equipos!subcampeon_equipo_id (id, nombre, codigo_pais)`,
    )
  if (error) throw error
  return (data ?? []).map((row) => {
    const usuario = row.usuario as unknown as { nombre: string; foto_url: string | null } | null
    return {
      usuario_id: row.usuario_id,
      nombre: usuario?.nombre ?? 'Usuario',
      foto_url: usuario?.foto_url ?? null,
      campeon: row.campeon as unknown as EquipoMini | null,
      subcampeon: row.subcampeon as unknown as EquipoMini | null,
      goleador_nombre: row.goleador_nombre,
      puntos_campeon: row.puntos_campeon,
      puntos_subcampeon: row.puntos_subcampeon,
      puntos_goleador: row.puntos_goleador,
    }
  })
}

export async function mundialIniciado(supabase: Client): Promise<boolean> {
  const { data, error } = await supabase.rpc('mundial_iniciado')
  if (error) throw error
  return Boolean(data)
}
