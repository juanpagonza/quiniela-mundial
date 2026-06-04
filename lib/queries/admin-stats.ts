import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, EstadoPartido, FasePartido } from '@/lib/supabase/types'
import type { EquipoMini } from './partidos'

type Client = SupabaseClient<Database>

export interface AdminStats {
  total_usuarios: number
  total_admins: number
  total_partidos: number
  partidos_habilitados: number
  partidos_finalizados: number
  total_predicciones_partido: number
  total_predicciones_bonus: number
  total_predicciones_torneo: number
  total_preguntas_bonus: number
  proximo_partido: ProximoPartidoAdmin | null
}

export interface ProximoPartidoAdmin {
  id: string
  fase: FasePartido
  estado: EstadoPartido
  fecha_hora_kickoff: string
  habilitado_para_predecir: boolean
  equipo_local: EquipoMini
  equipo_visitante: EquipoMini
}

/**
 * Counts + the next match for the admin dashboard. Each count is a HEAD
 * request with count='exact' — no payload, just the number. Inlined per
 * table because abstracting it as a helper makes Supabase's generated
 * column-name types lose their per-table specificity.
 */
export async function obtenerAdminStats(supabase: Client): Promise<AdminStats> {
  const ahora = new Date().toISOString()

  const [
    usuarios,
    admins,
    partidos,
    partidosHabilitados,
    partidosFinalizados,
    predPartido,
    predBonus,
    predTorneo,
    preguntasBonus,
    proximoPartidoData,
  ] = await Promise.all([
    // After migration 00027 we can no longer SELECT * on usuarios from the
    // authenticated role (the email column is REVOKEd). For head-counts we
    // pin to a specific allowed column to keep PostgREST's permission check
    // happy. Pattern repeats below for the admin count.
    supabase.from('usuarios').select('id', { count: 'exact', head: true }),
    supabase
      .from('usuarios')
      .select('id', { count: 'exact', head: true })
      .eq('es_admin', true),
    supabase.from('partidos').select('*', { count: 'exact', head: true }),
    supabase
      .from('partidos')
      .select('*', { count: 'exact', head: true })
      .eq('habilitado_para_predecir', true),
    supabase
      .from('partidos')
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'finalizado'),
    supabase
      .from('predicciones_partido')
      .select('*', { count: 'exact', head: true }),
    supabase
      .from('predicciones_bonus')
      .select('*', { count: 'exact', head: true }),
    supabase
      .from('predicciones_torneo')
      .select('*', { count: 'exact', head: true }),
    supabase
      .from('preguntas_bonus')
      .select('*', { count: 'exact', head: true }),
    supabase
      .from('partidos')
      .select(
        `id, fase, estado, fecha_hora_kickoff, habilitado_para_predecir,
         equipo_local:equipos!equipo_local_id (id, nombre, codigo_pais),
         equipo_visitante:equipos!equipo_visitante_id (id, nombre, codigo_pais)`,
      )
      .gt('fecha_hora_kickoff', ahora)
      .order('fecha_hora_kickoff', { ascending: true })
      .limit(1)
      .maybeSingle(),
  ])

  for (const r of [
    usuarios,
    admins,
    partidos,
    partidosHabilitados,
    partidosFinalizados,
    predPartido,
    predBonus,
    predTorneo,
    preguntasBonus,
  ]) {
    if (r.error) throw r.error
  }
  if (proximoPartidoData.error) throw proximoPartidoData.error

  return {
    total_usuarios: usuarios.count ?? 0,
    total_admins: admins.count ?? 0,
    total_partidos: partidos.count ?? 0,
    partidos_habilitados: partidosHabilitados.count ?? 0,
    partidos_finalizados: partidosFinalizados.count ?? 0,
    total_predicciones_partido: predPartido.count ?? 0,
    total_predicciones_bonus: predBonus.count ?? 0,
    total_predicciones_torneo: predTorneo.count ?? 0,
    total_preguntas_bonus: preguntasBonus.count ?? 0,
    proximo_partido: proximoPartidoData.data
      ? {
          id: proximoPartidoData.data.id,
          fase: proximoPartidoData.data.fase,
          estado: proximoPartidoData.data.estado,
          fecha_hora_kickoff: proximoPartidoData.data.fecha_hora_kickoff,
          habilitado_para_predecir:
            proximoPartidoData.data.habilitado_para_predecir,
          equipo_local:
            proximoPartidoData.data.equipo_local as unknown as EquipoMini,
          equipo_visitante:
            proximoPartidoData.data.equipo_visitante as unknown as EquipoMini,
        }
      : null,
  }
}
