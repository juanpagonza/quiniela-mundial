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
 * that modify admin-controlled state should call it after the underlying
 * mutation succeeds.
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
