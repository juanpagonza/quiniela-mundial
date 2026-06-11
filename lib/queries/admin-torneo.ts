import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

type Client = SupabaseClient<Database>

export interface UsuarioConTorneo {
  id: string
  nombre: string
  foto_url: string | null
  tiene_prediccion: boolean
}

export interface PrediccionTorneoAdmin {
  usuario_id: string
  campeon_equipo_id: string | null
  subcampeon_equipo_id: string | null
  goleador_nombre: string | null
  puntos_campeon: number
  puntos_subcampeon: number
  puntos_goleador: number
  updated_at: string | null
}

/**
 * Lista de usuarios para el dropdown del picker — todos los usuarios,
 * con bandera (tiene_prediccion) que marca quién ya tiene fila en
 * predicciones_torneo. Una sola tanda paralela para minimizar latencia.
 *
 * `tiene_prediccion` no chequea si la fila tiene algún campo no-null,
 * solo si existe — el admin puede usarlo para "crear" la fila de un
 * participante que abandonó la quiniela del torneo.
 */
export async function obtenerUsuariosParaTorneo(
  supabase: Client,
): Promise<UsuarioConTorneo[]> {
  const [usuariosRes, torneoRes] = await Promise.all([
    supabase
      .from('usuarios')
      .select('id, nombre, foto_url')
      .order('nombre', { ascending: true }),
    supabase.from('predicciones_torneo').select('usuario_id'),
  ])

  if (usuariosRes.error) throw usuariosRes.error
  if (torneoRes.error) throw torneoRes.error

  const conPrediccion = new Set(
    (torneoRes.data ?? []).map((r) => r.usuario_id),
  )

  return (usuariosRes.data ?? []).map((u) => ({
    id: u.id,
    nombre: u.nombre,
    foto_url: u.foto_url,
    tiene_prediccion: conPrediccion.has(u.id),
  }))
}

/**
 * Lee la fila de predicciones_torneo del usuario seleccionado. Devuelve
 * null si todavía no la tiene — el caller renderiza el formulario con
 * defaults vacíos para que el admin pueda crearla por upsert.
 */
export async function obtenerTorneoUsuarioAdmin(
  supabase: Client,
  usuarioId: string,
): Promise<PrediccionTorneoAdmin | null> {
  const { data, error } = await supabase
    .from('predicciones_torneo')
    .select(
      `usuario_id, campeon_equipo_id, subcampeon_equipo_id, goleador_nombre,
       puntos_campeon, puntos_subcampeon, puntos_goleador, updated_at`,
    )
    .eq('usuario_id', usuarioId)
    .maybeSingle()

  if (error) throw error
  return data
}

// El catálogo de equipos es idéntico al del formulario del usuario, así que
// re-exportamos para que el page del admin no tenga que importar de dos
// módulos (uno "user-facing", otro "admin-facing").
export { obtenerEquiposParaTorneo } from './torneo'
