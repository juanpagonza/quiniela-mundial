import 'server-only'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import type { AccionAuditoria, Json } from '@/lib/supabase/types'

export interface RegistrarAccionInput {
  adminId: string
  accion: AccionAuditoria
  entidadTipo: string
  entidadId?: string | null
  valorAnterior?: unknown
  valorNuevo?: unknown
  motivo?: string | null
}

/**
 * Append-only writer for log_auditoria. The table has NO insert policy for
 * authenticated callers (intentional — see Fase 2.6 migration), so we use
 * service-role to write. valorAnterior/valorNuevo are stored as JSONB so
 * the admin UI can render a diff of arbitrary entity shapes.
 *
 * This helper is the single chokepoint for audit writes. Server Actions
 * that modify admin-controlled state must call it after the underlying
 * mutation succeeds. The pattern used everywhere in lib/actions/* is:
 *
 *   1. requireAdmin() — fail fast on unauthorized callers, get user.id
 *   2. SELECT the row before mutating (capture `anterior`)
 *   3. UPDATE/INSERT/DELETE via createServiceRoleClient()
 *   4. registrarAccion({ adminId: user.id, accion, ... }) with the diff
 *   5. revalidatePath(...) to refresh affected pages
 *
 * One exception: importarFixtureAction does NOT log — it's a bulk import
 * of dozens of equipos+partidos and there's no enum value that fits.
 * Add a dedicated enum + entry if/when this stops being acceptable.
 */
export async function registrarAccion(input: RegistrarAccionInput): Promise<void> {
  const client = createServiceRoleClient()
  const { error } = await client.from('log_auditoria').insert({
    admin_id: input.adminId,
    accion: input.accion,
    entidad_tipo: input.entidadTipo,
    entidad_id: input.entidadId ?? null,
    valor_anterior: (input.valorAnterior ?? null) as Json,
    valor_nuevo: (input.valorNuevo ?? null) as Json,
    motivo: input.motivo ?? null,
  })
  if (error) {
    // Don't throw — auditing failure shouldn't roll back the real action.
    // Log loudly so it shows up in Vercel function logs.
    console.error('[audit] registrarAccion failed:', error, { input })
  }
}
