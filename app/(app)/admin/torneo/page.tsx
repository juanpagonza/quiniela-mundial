import Link from 'next/link'
import { ChevronLeftIcon } from 'lucide-react'
import { requireAdmin } from '@/lib/auth/admin'
import { registrarAccionConThrottle } from '@/lib/audit'
import {
  obtenerEquiposParaTorneo,
  obtenerTorneoUsuarioAdmin,
  obtenerUsuariosParaTorneo,
} from '@/lib/queries/admin-torneo'
import { FormularioTorneoAdmin } from '@/components/admin/formulario-torneo-admin'
import { TorneoUsuarioPicker } from '@/components/admin/torneo-usuario-picker'

export default async function AdminTorneoPage({
  searchParams,
}: {
  searchParams: Promise<{ usuario?: string }>
}) {
  const { supabase, user } = await requireAdmin()
  const params = await searchParams
  const usuarioId = params.usuario?.trim() || null

  const [usuarios, equipos] = await Promise.all([
    obtenerUsuariosParaTorneo(supabase),
    obtenerEquiposParaTorneo(supabase),
  ])

  const data = usuarioId
    ? await obtenerTorneoUsuarioAdmin(supabase, usuarioId)
    : null

  const usuarioElegido = usuarios.find((u) => u.id === usuarioId) ?? null

  // Transparency log: record that the admin viewed this user's torneo
  // predictions. Throttled to one entry per (admin, user) every 5
  // minutes so reloads don't pile up the log. Skip when the admin is
  // viewing their own profile — that's not surveillance.
  if (usuarioId && usuarioElegido && usuarioId !== user.id) {
    await registrarAccionConThrottle({
      adminId: user.id,
      accion: 'ver_perfil_usuario',
      entidadTipo: 'usuario',
      entidadId: usuarioId,
      valorNuevo: { contexto: 'torneo' },
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin"
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeftIcon className="size-4" aria-hidden="true" />
        Volver al admin
      </Link>

      <div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Admin · Torneo
        </p>
        <h1 className="mt-1 font-display text-3xl font-medium leading-tight tracking-tight text-foreground sm:text-4xl">
          Editar predicciones de torneo
        </h1>
        <p className="mt-2 max-w-prose text-sm text-muted-foreground">
          Editá el campeón, subcampeón y goleador de un participante.
          Cualquier cambio queda marcado como editado por admin, se registra
          en el log de auditoría, y se recalculan los puntos automáticamente.
        </p>
      </div>

      <TorneoUsuarioPicker
        usuarios={usuarios}
        usuarioSeleccionado={usuarioId}
      />

      {!usuarioId ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/40 px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Elegí un participante para arrancar.
          </p>
        </div>
      ) : !usuarioElegido ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/40 px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No se encontró ese participante.
          </p>
        </div>
      ) : (
        <FormularioTorneoAdmin
          // Remount when the picker changes — that's how the form re-syncs
          // its local useState from the new prediccion props.
          key={usuarioId}
          usuarioId={usuarioId}
          usuarioNombre={usuarioElegido.nombre}
          equipos={equipos}
          prediccion={data}
        />
      )}
    </div>
  )
}
