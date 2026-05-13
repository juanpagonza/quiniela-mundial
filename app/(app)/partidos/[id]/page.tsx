import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { obtenerPartidoDetalle } from '@/lib/queries/partido-detalle'
import { BanderaEquipo } from '@/components/bandera-equipo'
import { formatearKickoff } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { ChevronLeftIcon } from 'lucide-react'
import { FormularioPrediccion } from './formulario-prediccion'
import type { FasePartido } from '@/lib/supabase/types'
import type { PrediccionUsuario } from '@/lib/queries/partido-detalle'

const FASE_LABELS: Record<FasePartido, string> = {
  grupos: 'Grupos',
  octavos: 'Octavos',
  cuartos: 'Cuartos',
  semis: 'Semifinales',
  tercer_puesto: 'Tercer puesto',
  final: 'Final',
}

interface PartidoDetallePageProps {
  params: Promise<{ id: string }>
}

export default async function PartidoDetallePage({
  params,
}: PartidoDetallePageProps) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const partido = await obtenerPartidoDetalle(supabase, id, user.id)
  if (!partido) notFound()

  const kickoffPasado = new Date(partido.fecha_hora_kickoff) <= new Date()
  const yaEmpezo =
    partido.estado === 'en_curso' || partido.estado === 'finalizado' || kickoffPasado

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/partidos"
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeftIcon className="size-4" aria-hidden="true" />
        Volver a partidos
      </Link>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {FASE_LABELS[partido.fase]} · {formatearKickoff(partido.fecha_hora_kickoff)}
        </p>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 rounded-2xl border border-border bg-card p-6 sm:p-8">
          <div className="flex flex-col items-center gap-3 text-center">
            <BanderaEquipo
              codigoPais={partido.equipo_local.codigo_pais}
              nombre={partido.equipo_local.nombre}
              size="lg"
              showName={false}
            />
            <span className="font-display text-base font-medium text-foreground sm:text-lg">
              {partido.equipo_local.nombre}
            </span>
          </div>

          {yaEmpezo ? (
            <div className="flex items-baseline gap-2 font-mono text-4xl font-semibold tabular-nums sm:text-5xl">
              <span>{partido.marcador_local_real ?? '–'}</span>
              <span className="text-muted-foreground/40">·</span>
              <span>{partido.marcador_visitante_real ?? '–'}</span>
            </div>
          ) : (
            <span className="font-display text-2xl font-light text-muted-foreground">
              vs
            </span>
          )}

          <div className="flex flex-col items-center gap-3 text-center">
            <BanderaEquipo
              codigoPais={partido.equipo_visitante.codigo_pais}
              nombre={partido.equipo_visitante.nombre}
              size="lg"
              showName={false}
            />
            <span className="font-display text-base font-medium text-foreground sm:text-lg">
              {partido.equipo_visitante.nombre}
            </span>
          </div>
        </div>
      </div>

      {yaEmpezo ? (
        <PrediccionesGrupo
          predicciones={partido.todas_predicciones}
          miUserId={user.id}
        />
      ) : (
        <FormularioPrediccion
          partidoId={partido.id}
          fechaHoraKickoff={partido.fecha_hora_kickoff}
          equipoLocal={partido.equipo_local}
          equipoVisitante={partido.equipo_visitante}
          habilitadoParaPredecir={partido.habilitado_para_predecir}
          prediccionExistente={partido.mi_prediccion}
        />
      )}
    </div>
  )
}

function PrediccionesGrupo({
  predicciones,
  miUserId,
}: {
  predicciones: PrediccionUsuario[]
  miUserId: string
}) {
  if (predicciones.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/40 px-6 py-12 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Sin predicciones
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Nadie predijo este partido.
        </p>
      </div>
    )
  }

  // Order: points desc (winners first), then by nombre.
  const ordenadas = [...predicciones].sort((a, b) => {
    if (b.puntos_obtenidos !== a.puntos_obtenidos) {
      return b.puntos_obtenidos - a.puntos_obtenidos
    }
    return a.nombre.localeCompare(b.nombre)
  })

  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-display text-xl font-medium text-foreground">
        Predicciones del grupo
      </h2>
      <ul className="overflow-hidden rounded-2xl border border-border bg-card divide-y divide-border">
        {ordenadas.map((p) => {
          const mia = p.usuario_id === miUserId
          return (
            <li
              key={p.usuario_id}
              className={cn(
                'flex items-center justify-between gap-4 px-4 py-3',
                mia && 'bg-accent/40',
              )}
            >
              <span className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  {p.nombre}
                </span>
                {mia && (
                  <span className="rounded-full bg-foreground px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-background">
                    Tú
                  </span>
                )}
              </span>
              <span className="flex items-center gap-3">
                <span className="font-mono text-base font-semibold tabular-nums text-foreground">
                  {p.marcador_local} – {p.marcador_visitante}
                </span>
                {p.puntos_obtenidos > 0 ? (
                  <span className="text-xs font-medium text-foreground">
                    +{p.puntos_obtenidos} pts
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">0</span>
                )}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
