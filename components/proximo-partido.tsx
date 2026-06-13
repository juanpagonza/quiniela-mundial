import Link from 'next/link'
import { BanderaEquipo } from '@/components/bandera-equipo'
import { BonusBadge } from '@/components/partido-card'
import { formatearKickoff, tiempoHastaKickoff } from '@/lib/dates'
import { ArrowRightIcon } from 'lucide-react'
import type { FasePartido } from '@/lib/supabase/types'
import type { ProximoPartido as ProximoPartidoData } from '@/lib/queries/dashboard'

const FASE_LABELS: Record<FasePartido, string> = {
  grupos: 'Grupos',
  octavos: 'Octavos',
  cuartos: 'Cuartos',
  semis: 'Semifinales',
  tercer_puesto: 'Tercer puesto',
  final: 'Final',
}

export function ProximoPartido({ partido }: { partido: ProximoPartidoData }) {
  const tienePrediccion = partido.mi_prediccion !== null

  return (
    <Link
      href={`/partidos/${partido.id}`}
      className="group block rounded-2xl border border-border bg-card p-6 transition-all hover:border-foreground/30 hover:shadow-sm focus-visible:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 sm:p-8"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Próximo partido · {FASE_LABELS[partido.fase]}
        </span>
        <span className="text-xs font-medium text-foreground">
          {tiempoHastaKickoff(partido.fecha_hora_kickoff)}
        </span>
      </div>

      <p className="mt-1 text-xs text-muted-foreground">
        {formatearKickoff(partido.fecha_hora_kickoff)}
      </p>

      {partido.count_preguntas_bonus > 0 && (
        <div className="mt-3">
          <BonusBadge count={partido.count_preguntas_bonus} />
        </div>
      )}

      <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="flex flex-col items-center gap-2 text-center">
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
        <span className="font-display text-xl font-light text-muted-foreground sm:text-2xl">
          vs
        </span>
        <div className="flex flex-col items-center gap-2 text-center">
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

      <div className="mt-6 flex items-center justify-between gap-3 border-t border-border/60 pt-4">
        {tienePrediccion && partido.mi_prediccion ? (
          <p className="text-sm text-muted-foreground">
            Tu predicción:{' '}
            <span className="font-mono font-semibold text-foreground">
              {partido.mi_prediccion.marcador_local} –{' '}
              {partido.mi_prediccion.marcador_visitante}
            </span>
          </p>
        ) : (
          <p className="text-sm font-medium text-foreground">
            Todavía no predijiste
          </p>
        )}
        <span className="inline-flex items-center gap-1 text-sm font-medium text-foreground transition-transform group-hover:translate-x-0.5">
          {tienePrediccion ? 'Editar' : 'Predecir'}
          <ArrowRightIcon className="size-4" aria-hidden="true" />
        </span>
      </div>
    </Link>
  )
}
