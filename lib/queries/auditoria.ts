import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  AccionAuditoria,
  Database,
  Json,
} from '@/lib/supabase/types'

type Client = SupabaseClient<Database>

export interface LogItem {
  id: string
  fecha: string
  accion: AccionAuditoria
  admin_id: string
  admin_nombre: string
  entidad_tipo: string
  entidad_id: string | null
  motivo: string | null
  valor_anterior: Json | null
  valor_nuevo: Json | null
}

export interface LogPage {
  items: LogItem[]
  total: number
}

export interface LogFiltros {
  accion: AccionAuditoria | null
  adminId: string | null
  /** ISO date string (YYYY-MM-DD), interpreted as start of day local. */
  desde: string | null
  /** ISO date string (YYYY-MM-DD), interpreted as start of next day local (exclusive upper bound). */
  hasta: string | null
}

export interface AdminMini {
  id: string
  nombre: string
}

/**
 * Returns admins who actually appear in the log so the filter picker
 * only shows useful options (not every es_admin user — there might be
 * brand-new admins that never acted).
 *
 * Two-step because the FK join syntax can't be done with DISTINCT in
 * a single PostgREST query: first pull distinct admin_ids from the
 * log, then resolve the nombres in one IN-lookup.
 */
export async function obtenerAdminsLog(
  supabase: Client,
): Promise<AdminMini[]> {
  const { data, error } = await supabase
    .from('log_auditoria')
    .select('admin_id')
  if (error) throw error
  const ids = Array.from(new Set((data ?? []).map((r) => r.admin_id)))
  if (ids.length === 0) return []

  const { data: usuarios, error: err2 } = await supabase
    .from('usuarios')
    .select('id, nombre')
    .in('id', ids)
    .order('nombre', { ascending: true })
  if (err2) throw err2
  return usuarios ?? []
}

/**
 * Paginated read of log_auditoria with optional filters. The `count: 'exact'`
 * option gives us the unfiltered total in the same round-trip — we use it
 * to render pagination ("page X of Y"). Sorted newest-first because the
 * admin almost always wants the most recent entries.
 *
 * `desde`/`hasta` are local YYYY-MM-DD dates. We convert them to ISO
 * timestamps so the comparison happens against `fecha` (timestamptz).
 * `hasta` is treated as the START of the next day so the inclusive feel
 * of "until Oct 5" actually includes Oct 5 23:59:59.
 */
export async function obtenerLogAuditoria(
  supabase: Client,
  filtros: LogFiltros,
  page: number,
  pageSize: number,
): Promise<LogPage> {
  const offset = (page - 1) * pageSize

  let query = supabase
    .from('log_auditoria')
    .select(
      `id, fecha, accion, admin_id, entidad_tipo, entidad_id, motivo,
       valor_anterior, valor_nuevo,
       admin:usuarios!admin_id (nombre)`,
      { count: 'exact' },
    )
    .order('fecha', { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (filtros.accion) query = query.eq('accion', filtros.accion)
  if (filtros.adminId) query = query.eq('admin_id', filtros.adminId)
  if (filtros.desde) {
    const desdeIso = new Date(filtros.desde + 'T00:00:00').toISOString()
    query = query.gte('fecha', desdeIso)
  }
  if (filtros.hasta) {
    const hastaPlus = new Date(filtros.hasta + 'T00:00:00')
    hastaPlus.setDate(hastaPlus.getDate() + 1)
    query = query.lt('fecha', hastaPlus.toISOString())
  }

  const { data, error, count } = await query
  if (error) throw error

  const items: LogItem[] = (data ?? []).map((row) => {
    const admin = row.admin as unknown as { nombre: string } | null
    return {
      id: row.id,
      fecha: row.fecha,
      accion: row.accion,
      admin_id: row.admin_id,
      admin_nombre: admin?.nombre ?? 'Admin',
      entidad_tipo: row.entidad_tipo,
      entidad_id: row.entidad_id,
      motivo: row.motivo,
      valor_anterior: row.valor_anterior,
      valor_nuevo: row.valor_nuevo,
    }
  })

  return { items, total: count ?? 0 }
}
