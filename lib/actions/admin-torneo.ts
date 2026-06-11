'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/admin'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { registrarAccion } from '@/lib/audit'
import type { AdminPrediccionActionState } from '@/lib/admin-predicciones-state'

const GOLEADOR_MAX = 80

export async function editarPrediccionTorneoAdmin(
  _prev: AdminPrediccionActionState,
  formData: FormData,
): Promise<AdminPrediccionActionState> {
  const { user } = await requireAdmin()

  const usuarioId = String(formData.get('usuarioId') ?? '').trim()
  if (!usuarioId) {
    return {
      result: { success: false, error: 'Falta el participante.' },
    }
  }

  const campeonEquipoId = readNullable(formData.get('campeonEquipoId'))
  const subcampeonEquipoId = readNullable(formData.get('subcampeonEquipoId'))
  const goleadorNombre = readNullable(formData.get('goleadorNombre'))

  if (
    campeonEquipoId &&
    subcampeonEquipoId &&
    campeonEquipoId === subcampeonEquipoId
  ) {
    return {
      result: {
        success: false,
        error: 'El campeón y el subcampeón tienen que ser equipos distintos.',
      },
    }
  }

  if (goleadorNombre && goleadorNombre.length > GOLEADOR_MAX) {
    return {
      result: {
        success: false,
        error: `El nombre del goleador no puede tener más de ${GOLEADOR_MAX} caracteres.`,
      },
    }
  }

  const client = createServiceRoleClient()

  // Snapshot the old row so the audit log can show the diff. May be null
  // if the user never filled in their tournament prediction.
  const { data: anterior } = await client
    .from('predicciones_torneo')
    .select('campeon_equipo_id, subcampeon_equipo_id, goleador_nombre')
    .eq('usuario_id', usuarioId)
    .maybeSingle()

  // Upsert preserves any unrelated columns (puntos_*, created_at) when the
  // row exists, and creates a fresh row with defaults when it doesn't.
  // usuario_id is UNIQUE in predicciones_torneo, see 00006/00012 migrations.
  const { error: upsertError } = await client
    .from('predicciones_torneo')
    .upsert(
      {
        usuario_id: usuarioId,
        campeon_equipo_id: campeonEquipoId,
        subcampeon_equipo_id: subcampeonEquipoId,
        goleador_nombre: goleadorNombre,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'usuario_id' },
    )

  if (upsertError) {
    return { result: { success: false, error: upsertError.message } }
  }

  // Recalculate tournament points. Safe to call regardless of whether the
  // final has happened yet — sets everyone's points to 0 if not, or the
  // correct values if so. Idempotent. Hard-fails silently to keep the
  // user-visible edit landed even if the RPC misfires.
  const { error: rpcError } = await client.rpc('calcular_puntos_torneo')
  if (rpcError) {
    console.error('[admin] calcular_puntos_torneo failed:', rpcError)
  }

  await registrarAccion({
    adminId: user.id,
    accion: 'editar_prediccion_torneo',
    entidadTipo: 'prediccion_torneo',
    entidadId: usuarioId,
    valorAnterior: anterior
      ? {
          campeon_equipo_id: anterior.campeon_equipo_id,
          subcampeon_equipo_id: anterior.subcampeon_equipo_id,
          goleador_nombre: anterior.goleador_nombre,
        }
      : null,
    valorNuevo: {
      campeon_equipo_id: campeonEquipoId,
      subcampeon_equipo_id: subcampeonEquipoId,
      goleador_nombre: goleadorNombre,
    },
  })

  revalidatePath('/admin/torneo')
  revalidatePath('/admin/auditoria')
  revalidatePath('/admin')
  revalidatePath('/tabla')
  revalidatePath('/')
  revalidatePath('/perfil')

  return {
    result: {
      success: true,
      message: 'Predicción del Mundial actualizada',
    },
  }
}

/** Empty-string FormData values become null so the DB stores NULL, not ''. */
function readNullable(v: FormDataEntryValue | null): string | null {
  if (v === null) return null
  const s = String(v).trim()
  return s.length > 0 ? s : null
}
