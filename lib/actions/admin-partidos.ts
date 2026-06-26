'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/admin'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { registrarAccion } from '@/lib/audit'
import { importarFixture } from '@/lib/football-api/import-fixture'
import type { AdminPartidoActionState } from '@/lib/admin-partidos-state'
import type { EstadoPartido } from '@/lib/supabase/types'

const ESTADOS_VALIDOS: ReadonlyArray<EstadoPartido> = [
  'programado',
  'en_curso',
  'finalizado',
  'suspendido',
]

function revalidatePartidoPaths(partidoId: string) {
  revalidatePath('/admin/partidos')
  revalidatePath('/admin')
  revalidatePath(`/admin/partidos/${partidoId}`)
  revalidatePath(`/partidos/${partidoId}`)
  revalidatePath('/partidos')
  revalidatePath('/tabla')
  revalidatePath('/')
}

// ----- Toggle habilitado -------------------------------------------------

export async function toggleHabilitadoPartido(
  _prev: AdminPartidoActionState,
  formData: FormData,
): Promise<AdminPartidoActionState> {
  const { user } = await requireAdmin()
  const partidoId = String(formData.get('partidoId') ?? '')
  const nuevoValor = formData.get('habilitado') === 'true'

  if (!partidoId) {
    return { result: { success: false, error: 'Falta el id del partido.' } }
  }

  const client = createServiceRoleClient()
  const { data: actual } = await client
    .from('partidos')
    .select('habilitado_para_predecir')
    .eq('id', partidoId)
    .single()

  const { error } = await client
    .from('partidos')
    .update({ habilitado_para_predecir: nuevoValor })
    .eq('id', partidoId)

  if (error) return { result: { success: false, error: error.message } }

  await registrarAccion({
    adminId: user.id,
    accion: 'habilitar_partido',
    entidadTipo: 'partido',
    entidadId: partidoId,
    valorAnterior: { habilitado_para_predecir: actual?.habilitado_para_predecir ?? null },
    valorNuevo: { habilitado_para_predecir: nuevoValor },
  })

  revalidatePartidoPaths(partidoId)
  return {
    result: {
      success: true,
      message: nuevoValor ? 'Partido visible' : 'Partido oculto',
    },
  }
}

// ----- Editar resultado --------------------------------------------------

export async function editarResultadoPartido(
  _prev: AdminPartidoActionState,
  formData: FormData,
): Promise<AdminPartidoActionState> {
  const { user } = await requireAdmin()
  const partidoId = String(formData.get('partidoId') ?? '')
  if (!partidoId) {
    return { result: { success: false, error: 'Falta el id del partido.' } }
  }

  const localRaw = formData.get('marcador_local_real')
  const visitRaw = formData.get('marcador_visitante_real')
  const estadoRaw = String(formData.get('estado') ?? '')

  if (!ESTADOS_VALIDOS.includes(estadoRaw as EstadoPartido)) {
    return { result: { success: false, error: 'Estado inválido.' } }
  }
  const estado = estadoRaw as EstadoPartido

  const marcadorLocal = parseMarcador(localRaw)
  const marcadorVisitante = parseMarcador(visitRaw)
  if (marcadorLocal === 'invalid' || marcadorVisitante === 'invalid') {
    return {
      result: {
        success: false,
        error: 'Los marcadores deben ser enteros entre 0 y 50, o vacíos.',
      },
    }
  }

  const client = createServiceRoleClient()
  const { data: actual } = await client
    .from('partidos')
    .select('marcador_local_real, marcador_visitante_real, estado')
    .eq('id', partidoId)
    .single()

  const { error } = await client
    .from('partidos')
    .update({
      marcador_local_real: marcadorLocal,
      marcador_visitante_real: marcadorVisitante,
      estado,
      updated_at: new Date().toISOString(),
    })
    .eq('id', partidoId)

  if (error) return { result: { success: false, error: error.message } }

  await registrarAccion({
    adminId: user.id,
    accion: 'editar_resultado_partido',
    entidadTipo: 'partido',
    entidadId: partidoId,
    valorAnterior: actual ?? null,
    valorNuevo: {
      marcador_local_real: marcadorLocal,
      marcador_visitante_real: marcadorVisitante,
      estado,
    },
  })

  revalidatePartidoPaths(partidoId)
  return { result: { success: true, message: 'Resultado actualizado' } }
}

function parseMarcador(raw: FormDataEntryValue | null): number | null | 'invalid' {
  if (raw == null) return null
  const s = String(raw).trim()
  if (s.length === 0) return null
  const n = Number(s)
  if (!Number.isInteger(n) || n < 0 || n > 50) return 'invalid'
  return n
}

// ----- Importar fixture --------------------------------------------------

export async function importarFixtureAction(
  _prev: AdminPartidoActionState,
  _formData: FormData,
): Promise<AdminPartidoActionState> {
  await requireAdmin()

  try {
    const client = createServiceRoleClient()
    const result = await importarFixture(client)
    revalidatePath('/admin/partidos')
    revalidatePath('/admin')
    revalidatePath('/partidos')
    revalidatePath('/')
    const omitidoTBD =
      result.partidos_omitidos_tbd > 0
        ? `${result.partidos_omitidos_tbd} TBD`
        : ''
    const omitidoFin =
      result.partidos_omitidos_finalizados > 0
        ? `${result.partidos_omitidos_finalizados} ya finalizados`
        : ''
    const notas = [omitidoTBD, omitidoFin].filter(Boolean).join(', ')
    const sufijo = notas ? ` (${notas} omitidos)` : ''
    return {
      result: {
        success: true,
        message: `Importados ${result.equipos_importados} equipos y ${result.partidos_importados} partidos${sufijo}`,
      },
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { result: { success: false, error: msg } }
  }
}
