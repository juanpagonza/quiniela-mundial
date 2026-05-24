import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

type Client = SupabaseClient<Database>

export interface UsuarioMini {
  id: string
  nombre: string
}

export interface AjusteItem {
  id: string
  created_at: string
  puntos: number
  motivo: string
  usuario_nombre: string
  admin_nombre: string
}

/** Catálogo de usuarios para el dropdown del formulario. */
export async function obtenerUsuariosParaAjustes(
  supabase: Client,
): Promise<UsuarioMini[]> {
  const { data, error } = await supabase
    .from('usuarios')
    .select('id, nombre')
    .order('nombre', { ascending: true })
  if (error) throw error
  return data ?? []
}

/** Lista de ajustes más recientes para la sección "Historial". */
export async function obtenerAjustes(
  supabase: Client,
  limit = 50,
): Promise<AjusteItem[]> {
  const { data, error } = await supabase
    .from('ajustes_puntos_manuales')
    .select(
      `id, created_at, puntos, motivo,
       usuario:usuarios!usuario_id (nombre),
       admin:usuarios!admin_id (nombre)`,
    )
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []).map((row) => {
    const usuario = row.usuario as unknown as { nombre: string } | null
    const admin = row.admin as unknown as { nombre: string } | null
    return {
      id: row.id,
      created_at: row.created_at,
      puntos: row.puntos,
      motivo: row.motivo,
      usuario_nombre: usuario?.nombre ?? 'Usuario',
      admin_nombre: admin?.nombre ?? 'Admin',
    }
  })
}
