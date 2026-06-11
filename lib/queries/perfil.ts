import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Database,
  EstadoPartido,
  FasePartido,
} from '@/lib/supabase/types'
import type { EquipoMini } from './partidos'

type Client = SupabaseClient<Database>

export interface MiPrediccionEnPerfil {
  partido_id: string
  fecha_hora_kickoff: string
  fase: FasePartido
  estado: EstadoPartido
  marcador_local_real: number | null
  marcador_visitante_real: number | null
  equipo_local: EquipoMini
  equipo_visitante: EquipoMini
  mi_marcador_local: number
  mi_marcador_visitante: number
  puntos_obtenidos: number
}

export interface MiPrediccionTorneo {
  campeon: EquipoMini | null
  subcampeon: EquipoMini | null
  goleador_nombre: string | null
  puntos_campeon: number
  puntos_subcampeon: number
  puntos_goleador: number
}

export interface PerfilUsuario {
  puntos_totales: number
  marcadores_exactos: number
  total_predicciones: number
  aciertos: number
  predicciones: MiPrediccionEnPerfil[]
  torneo: MiPrediccionTorneo | null
  mundial_iniciado: boolean
  accesos_admin: AccesoAdmin[]
}

/** A single entry in the user's "accesos del admin" timeline. */
export interface AccesoAdmin {
  id: string
  fecha: string
  admin_nombre: string
  /** 'vista' = just looked, 'edicion' = changed something */
  tipo: 'vista' | 'edicion'
  /** Brief human-readable description of what was touched. */
  detalle: string
}

/**
 * Builds the per-user breakdown for /perfil. Combines:
 * - The user's row in the leaderboard view (puntos, exactos).
 * - Their full predicciones_partido list joined with partidos + equipos so
 *   the page can group by fase and show real vs predicted.
 * - Their predicciones_torneo (1:1) joined with the picked equipos.
 * - mundial_iniciado() RPC to decide whether torneo picks are visible.
 *
 * All in parallel — the heaviest is the predicciones join, which for 15
 * users × 64 matches stays tiny.
 */
export async function obtenerPerfilUsuario(
  supabase: Client,
  userId: string,
): Promise<PerfilUsuario> {
  const [
    leaderboardRow,
    misPredicciones,
    miTorneo,
    iniciado,
    accesosVistas,
    accesosEdicionesPartido,
    accesosEdicionesBonus,
    accesosEdicionesTorneo,
  ] = await Promise.all([
    supabase
      .from('leaderboard')
      .select('puntos_totales, marcadores_exactos')
      .eq('usuario_id', userId)
      .maybeSingle(),
    supabase
      .from('predicciones_partido')
      .select(
        `marcador_local, marcador_visitante, puntos_obtenidos,
         partido:partidos!partido_id (
           id, fase, estado, fecha_hora_kickoff,
           marcador_local_real, marcador_visitante_real,
           equipo_local:equipos!equipo_local_id (id, nombre, codigo_pais),
           equipo_visitante:equipos!equipo_visitante_id (id, nombre, codigo_pais)
         )`,
      )
      .eq('usuario_id', userId),
    supabase
      .from('predicciones_torneo')
      .select(
        `campeon_equipo_id, subcampeon_equipo_id, goleador_nombre,
         puntos_campeon, puntos_subcampeon, puntos_goleador,
         campeon:equipos!campeon_equipo_id (id, nombre, codigo_pais),
         subcampeon:equipos!subcampeon_equipo_id (id, nombre, codigo_pais)`,
      )
      .eq('usuario_id', userId)
      .maybeSingle(),
    supabase.rpc('mundial_iniciado'),
    // Accesos del admin: tres fuentes que después juntamos en memoria.
    // (1) Vistas explícitas: accion='ver_perfil_usuario' con entidad_id = userId
    supabase
      .from('log_auditoria')
      .select(`id, fecha, accion, admin:usuarios!admin_id (nombre)`)
      .eq('accion', 'ver_perfil_usuario')
      .eq('entidad_id', userId)
      .order('fecha', { ascending: false })
      .limit(50),
    // (2) Ediciones de prediccion_partido del user — usamos el operador
    //     JSONB path filter de PostgREST: valor_nuevo->>usuario_id = userId
    supabase
      .from('log_auditoria')
      .select(`id, fecha, accion, admin:usuarios!admin_id (nombre)`)
      .eq('accion', 'editar_prediccion_partido')
      .filter('valor_nuevo->>usuario_id', 'eq', userId)
      .order('fecha', { ascending: false })
      .limit(50),
    // (3) Ediciones de prediccion_bonus del user
    supabase
      .from('log_auditoria')
      .select(`id, fecha, accion, admin:usuarios!admin_id (nombre)`)
      .eq('accion', 'editar_prediccion_bonus')
      .filter('valor_nuevo->>usuario_id', 'eq', userId)
      .order('fecha', { ascending: false })
      .limit(50),
    // (4) Ediciones de prediccion_torneo del user — entidad_id = userId
    //     porque predicciones_torneo tiene UNIQUE(usuario_id) y esa es la
    //     convención que elige el action.
    supabase
      .from('log_auditoria')
      .select(`id, fecha, accion, admin:usuarios!admin_id (nombre)`)
      .eq('accion', 'editar_prediccion_torneo')
      .eq('entidad_id', userId)
      .order('fecha', { ascending: false })
      .limit(50),
  ])

  if (leaderboardRow.error) throw leaderboardRow.error
  if (misPredicciones.error) throw misPredicciones.error
  if (miTorneo.error) throw miTorneo.error
  if (iniciado.error) throw iniciado.error
  if (accesosVistas.error) throw accesosVistas.error
  if (accesosEdicionesPartido.error) throw accesosEdicionesPartido.error
  if (accesosEdicionesBonus.error) throw accesosEdicionesBonus.error
  if (accesosEdicionesTorneo.error) throw accesosEdicionesTorneo.error

  const predicciones: MiPrediccionEnPerfil[] = (misPredicciones.data ?? [])
    .map((row) => {
      const partido = row.partido as unknown as {
        id: string
        fase: FasePartido
        estado: EstadoPartido
        fecha_hora_kickoff: string
        marcador_local_real: number | null
        marcador_visitante_real: number | null
        equipo_local: EquipoMini
        equipo_visitante: EquipoMini
      } | null
      if (!partido) return null
      return {
        partido_id: partido.id,
        fecha_hora_kickoff: partido.fecha_hora_kickoff,
        fase: partido.fase,
        estado: partido.estado,
        marcador_local_real: partido.marcador_local_real,
        marcador_visitante_real: partido.marcador_visitante_real,
        equipo_local: partido.equipo_local,
        equipo_visitante: partido.equipo_visitante,
        mi_marcador_local: row.marcador_local,
        mi_marcador_visitante: row.marcador_visitante,
        puntos_obtenidos: row.puntos_obtenidos,
      } satisfies MiPrediccionEnPerfil
    })
    .filter((p): p is MiPrediccionEnPerfil => p !== null)
    .sort(
      (a, b) =>
        new Date(a.fecha_hora_kickoff).getTime() -
        new Date(b.fecha_hora_kickoff).getTime(),
    )

  const torneo: MiPrediccionTorneo | null = miTorneo.data
    ? {
        campeon: miTorneo.data.campeon as unknown as EquipoMini | null,
        subcampeon: miTorneo.data.subcampeon as unknown as EquipoMini | null,
        goleador_nombre: miTorneo.data.goleador_nombre,
        puntos_campeon: miTorneo.data.puntos_campeon,
        puntos_subcampeon: miTorneo.data.puntos_subcampeon,
        puntos_goleador: miTorneo.data.puntos_goleador,
      }
    : null

  const aciertos = predicciones.filter((p) => p.puntos_obtenidos > 0).length

  // Merge the 4 access sources, sort by date desc, keep the top 30.
  // Both edition rows carry the same shape from PostgREST — the join brings
  // `admin: { nombre }` either as an object or null if the FK is broken
  // (shouldn't happen but be defensive).
  type RawAccesoRow = {
    id: string
    fecha: string
    accion:
      | 'ver_perfil_usuario'
      | 'editar_prediccion_partido'
      | 'editar_prediccion_bonus'
      | 'editar_prediccion_torneo'
    admin: { nombre: string } | { nombre: string }[] | null
  }
  const mapAcceso = (
    row: RawAccesoRow,
    tipo: 'vista' | 'edicion',
    detalle: string,
  ): AccesoAdmin => {
    const adminObj = Array.isArray(row.admin) ? row.admin[0] : row.admin
    return {
      id: row.id,
      fecha: row.fecha,
      admin_nombre: adminObj?.nombre ?? 'Admin',
      tipo,
      detalle,
    }
  }
  const accesos_admin: AccesoAdmin[] = [
    ...(accesosVistas.data ?? []).map((r) =>
      mapAcceso(r as RawAccesoRow, 'vista', 'Vio tus predicciones'),
    ),
    ...(accesosEdicionesPartido.data ?? []).map((r) =>
      mapAcceso(r as RawAccesoRow, 'edicion', 'Editó una predicción de partido'),
    ),
    ...(accesosEdicionesBonus.data ?? []).map((r) =>
      mapAcceso(r as RawAccesoRow, 'edicion', 'Editó una respuesta bonus'),
    ),
    ...(accesosEdicionesTorneo.data ?? []).map((r) =>
      mapAcceso(r as RawAccesoRow, 'edicion', 'Editó tu predicción del Mundial'),
    ),
  ]
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    .slice(0, 30)

  return {
    puntos_totales: leaderboardRow.data?.puntos_totales ?? 0,
    marcadores_exactos: leaderboardRow.data?.marcadores_exactos ?? 0,
    total_predicciones: predicciones.length,
    aciertos,
    predicciones,
    torneo,
    mundial_iniciado: Boolean(iniciado.data),
    accesos_admin,
  }
}
