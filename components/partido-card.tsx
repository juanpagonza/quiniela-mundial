import Link from 'next/link'
import { BanderaEquipo } from '@/components/bandera-equipo'
import { formatearKickoff, tiempoHastaKickoff, estaBloqueado } from '@/lib/dates'
import { cn } from '@/lib/utils'
import type { FasePartido, EstadoPartido } from '@/lib/supabase/types'
import type { PartidoConPrediccion } from '@/lib/queries/partidos'

const FASE_LABELS: Record<FasePartido, string> = {
  grupos: 'Grupos',
  octavos: 'Octavos',
  cuartos: 'Cuartos',
  semis: 'Semifinales',
  tercer_puesto: 'Tercer puesto',
  final: 'Final',
}

interface BadgeInfo {
  label: string
  tone: 'live' | 'final' | 'paused' | null
}

function badgeFor(estado: EstadoPartido): BadgeInfo {
  switch (estado) {
    case 'en_curso':
      return { label: 'En vivo', tone: 'live' }
    case 'finalizado':
      return { label: 'Final', tone: 'final' }
    case 'suspendido':
      return { label: 'Suspendido', tone: 'paused' }
    default:
      return { label: '', tone: null }
  }
}

function StatusBadge({ tone, label }: BadgeInfo) {
  if (!tone) return null
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider',
        tone === 'live' &&
          'bg-destructive/10 text-destructive ring-1 ring-destructive/30',
        tone === 'final' && 'bg-foreground/10 text-foreground/80',
        tone === 'paused' && 'bg-muted text-muted-foreground',
      )}
    >
      {tone === 'live' && (
        <span
          aria-hidden="true"
          className="size-1.5 animate-pulse rounded-full bg-destructive"
        />
      )}
      {label}
    </span>
  )
}

function PrediccionFooter({ partido }: { partido: PartidoConPrediccion }) {
  const { mi_prediccion: pred, estado, habilitado_para_predecir } = partido
  const bloqueado = estaBloqueado(partido.fecha_hora_kickoff)
  const finalizado = estado === 'finalizado'

  if (pred) {
    return (
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Tu predicción:{' '}
          <span className="font-mono font-semibold text-foreground">
            {pred.marcador_local} – {pred.marcador_visitante}
          </span>
        </span>
        {finalizado && (
          <span
            className={cn(
              'font-medium',
              pred.puntos_obtenidos > 0 ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            {pred.puntos_obtenidos > 0
              ? `+${pred.puntos_obtenidos} pts`
              : 'Sin puntos'}
          </span>
        )}
      </div>
    )
  }

  if (bloqueado) {
    return (
      <p className="text-xs italic text-muted-foreground">
        No predijiste este partido.
      </p>
    )
  }

  if (!habilitado_para_predecir) {
    return (
      <p className="text-xs italic text-muted-foreground">
        Las predicciones aún no están abiertas.
      </p>
    )
  }

  return <p className="text-xs italic text-muted-foreground">Sin predicción todavía.</p>
}

function CenterScore({ partido }: { partido: PartidoConPrediccion }) {
  const yaEmpezo =
    partido.estado === 'en_curso' || partido.estado === 'finalizado'

  if (yaEmpezo) {
    return (
      <div className="flex shrink-0 items-baseline gap-2 font-mono text-2xl font-semibold tabular-nums leading-none text-foreground">
        <span>{partido.marcador_local_real ?? '–'}</span>
        <span className="text-muted-foreground/40">·</span>
        <span>{partido.marcador_visitante_real ?? '–'}</span>
      </div>
    )
  }

  return (
    <div className="flex shrink-0 flex-col items-center gap-0.5 text-center">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        vs
      </span>
      <span className="text-[10px] text-muted-foreground/70">
        {tiempoHastaKickoff(partido.fecha_hora_kickoff)}
      </span>
    </div>
  )
}

export function PartidoCard({ partido }: { partido: PartidoConPrediccion }) {
  const badge = badgeFor(partido.estado)

  return (
    <Link
      href={`/partidos/${partido.id}`}
      className="group block rounded-2xl border border-border bg-card p-4 transition-all hover:border-foreground/30 hover:shadow-sm focus-visible:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {formatearKickoff(partido.fecha_hora_kickoff)}
          <span className="mx-1.5 text-muted-foreground/40">·</span>
          <span className="font-medium text-foreground/80">
            {FASE_LABELS[partido.fase]}
          </span>
        </span>
        <StatusBadge {...badge} />
      </div>

      <div className="flex items-center justify-between gap-3">
        <BanderaEquipo
          codigoPais={partido.equipo_local.codigo_pais}
          nombre={partido.equipo_local.nombre}
          size="md"
          className="min-w-0 flex-1"
        />
        <CenterScore partido={partido} />
        <BanderaEquipo
          codigoPais={partido.equipo_visitante.codigo_pais}
          nombre={partido.equipo_visitante.nombre}
          size="md"
          className="min-w-0 flex-1 flex-row-reverse text-right"
        />
      </div>

      <div className="mt-3 border-t border-border/60 pt-2.5">
        <PrediccionFooter partido={partido} />
      </div>

      {partido.count_preguntas_bonus > 0 && (
        <div className="mt-2.5">
          <BonusBadge count={partido.count_preguntas_bonus} />
        </div>
      )}
    </Link>
  )
}

export function BonusBadge({ count }: { count: number }) {
  const label =
    count === 1 ? 'Incluye pregunta bonus' : `Incluye ${count} preguntas bonus`
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">
      <span
        aria-hidden="true"
        className="size-2 rounded-full bg-emerald-500"
      />
      {label}
    </span>
  )
}
