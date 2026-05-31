import Link from 'next/link'
import { ChevronLeftIcon } from 'lucide-react'
import { requireAdmin } from '@/lib/auth/admin'
import { registrarAccionConThrottle } from '@/lib/audit'
import {
  obtenerPartidosParaPredicciones,
  obtenerPrediccionAdmin,
  obtenerUsuariosParaPredicciones,
} from '@/lib/queries/admin-predicciones'
import { PrediccionesPickers } from '@/components/admin/predicciones-pickers'
import { FormularioPrediccionPartidoAdmin } from '@/components/admin/formulario-prediccion-partido-admin'
import { FormularioPrediccionBonusAdmin } from '@/components/admin/formulario-prediccion-bonus-admin'
import { BanderaEquipo } from '@/components/bandera-equipo'
import { formatearKickoff } from '@/lib/dates'
import type { FasePartido } from '@/lib/supabase/types'

const FASE_LABELS: Record<FasePartido, string> = {
  grupos: 'Grupos',
  octavos: 'Octavos',
  cuartos: 'Cuartos',
  semis: 'Semifinales',
  tercer_puesto: 'Tercer puesto',
  final: 'Final',
}

export default async function AdminPrediccionesPage({
  searchParams,
}: {
  searchParams: Promise<{
    usuario?: string
    partido?: string
  }>
}) {
  const { supabase, user } = await requireAdmin()
  const params = await searchParams
  const usuarioId = params.usuario?.trim() || null
  const partidoId = params.partido?.trim() || null

  const [usuarios, partidos] = await Promise.all([
    obtenerUsuariosParaPredicciones(supabase),
    obtenerPartidosParaPredicciones(supabase),
  ])

  const data =
    usuarioId && partidoId
      ? await obtenerPrediccionAdmin(supabase, usuarioId, partidoId)
      : null

  const usuarioElegido = usuarios.find((u) => u.id === usuarioId) ?? null

  // Transparency log: record that the admin viewed this user's predictions.
  // Throttled to one entry per (admin, user) every 5 minutes so reloads /
  // switching between partidos of the same user don't pile up the log.
  // The user sees these entries in their /perfil under "Accesos del admin".
  // Skip when the admin is viewing their own profile — that's not surveillance.
  if (usuarioId && data && usuarioId !== user.id) {
    await registrarAccionConThrottle({
      adminId: user.id,
      accion: 'ver_perfil_usuario',
      entidadTipo: 'usuario',
      entidadId: usuarioId,
      valorNuevo: null,
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
          Admin · Predicciones
        </p>
        <h1 className="mt-1 font-display text-3xl font-medium leading-tight tracking-tight text-foreground sm:text-4xl">
          Editar predicciones
        </h1>
        <p className="mt-2 max-w-prose text-sm text-muted-foreground">
          Elegí un participante y un partido para ver y editar su predicción.
          Cualquier cambio queda marcado como editado por admin, se registra
          en el log de auditoría, y si el partido ya terminó se recalculan
          los puntos automáticamente.
        </p>
      </div>

      <PrediccionesPickers
        usuarios={usuarios}
        partidos={partidos}
        usuarioSeleccionado={usuarioId}
        partidoSeleccionado={partidoId}
      />

      {!usuarioId || !partidoId ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/40 px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Elegí participante y partido para arrancar.
          </p>
        </div>
      ) : !data ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/40 px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No se encontró ese partido.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                {formatearKickoff(data.partido.fecha_hora_kickoff)}
                <span className="mx-1.5 text-muted-foreground/40">·</span>
                <span className="font-medium text-foreground/80">
                  {FASE_LABELS[data.partido.fase]}
                </span>
              </span>
              {usuarioElegido && (
                <span className="font-medium text-foreground">
                  Editando: {usuarioElegido.nombre}
                </span>
              )}
            </div>

            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <BanderaEquipo
                codigoPais={data.partido.equipo_local.codigo_pais}
                nombre={data.partido.equipo_local.nombre}
                size="md"
                className="min-w-0 flex-1"
              />
              <div className="flex items-baseline gap-2 font-mono text-2xl font-semibold tabular-nums leading-none">
                <span>{data.partido.marcador_local_real ?? '–'}</span>
                <span className="text-muted-foreground/40">·</span>
                <span>{data.partido.marcador_visitante_real ?? '–'}</span>
              </div>
              <BanderaEquipo
                codigoPais={data.partido.equipo_visitante.codigo_pais}
                nombre={data.partido.equipo_visitante.nombre}
                size="md"
                className="min-w-0 flex-1 flex-row-reverse text-right"
              />
            </div>
          </section>

          <FormularioPrediccionPartidoAdmin
            // Remount when picker pair changes — that's how the form
            // re-syncs its local useState from the new prediccion props.
            key={`${usuarioId}_${partidoId}`}
            usuarioId={usuarioId}
            partidoId={partidoId}
            prediccion={data.prediccion}
            nombreLocal={data.partido.equipo_local.nombre}
            nombreVisitante={data.partido.equipo_visitante.nombre}
            marcadorRealLocal={data.partido.marcador_local_real}
            marcadorRealVisitante={data.partido.marcador_visitante_real}
            partidoFinalizado={data.partido.estado === 'finalizado'}
          />

          {data.bonus.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="font-display text-xl font-medium text-foreground">
                Preguntas bonus
              </h2>
              {data.bonus.map((b) => (
                <FormularioPrediccionBonusAdmin
                  // usuarioId in the key so picking a different user also
                  // remounts the per-bonus state, not just the pregunta_id.
                  key={`${usuarioId}_${b.pregunta_id}`}
                  usuarioId={usuarioId}
                  partidoId={partidoId}
                  bonus={b}
                />
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  )
}
