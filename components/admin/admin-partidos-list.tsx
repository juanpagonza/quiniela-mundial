'use client'

import { useMemo, useState } from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BanderaEquipo } from '@/components/bandera-equipo'
import { ToggleHabilitadoButton } from './toggle-habilitado-button'
import { EditarResultadoDialog } from './editar-resultado-dialog'
import { formatearKickoff } from '@/lib/dates'
import { cn } from '@/lib/utils'
import type {
  EstadoPartido,
  FasePartido,
} from '@/lib/supabase/types'
import type { PartidoAdminItem } from '@/lib/queries/admin-partidos'

type Filtro = 'todos' | FasePartido

const TAB_ORDER: Array<{ value: Filtro; label: string }> = [
  { value: 'todos', label: 'Todos' },
  { value: 'grupos', label: 'Grupos' },
  { value: 'dieciseisavos', label: '16avos' },
  { value: 'octavos', label: 'Octavos' },
  { value: 'cuartos', label: 'Cuartos' },
  { value: 'semis', label: 'Semis' },
  { value: 'tercer_puesto', label: '3er' },
  { value: 'final', label: 'Final' },
]

const ESTADO_LABELS: Record<EstadoPartido, string> = {
  programado: 'Programado',
  en_curso: 'En vivo',
  finalizado: 'Final',
  suspendido: 'Suspendido',
}

export function AdminPartidosList({
  partidos,
}: {
  partidos: PartidoAdminItem[]
}) {
  const [filtro, setFiltro] = useState<Filtro>('todos')

  const fasesPresentes = useMemo(() => {
    const set = new Set<FasePartido>()
    for (const p of partidos) set.add(p.fase)
    return set
  }, [partidos])

  const tabs = useMemo(
    () =>
      TAB_ORDER.filter(
        (t) => t.value === 'todos' || fasesPresentes.has(t.value),
      ),
    [fasesPresentes],
  )

  // Mismo orden que la lista pública (/partidos): no-finalizados arriba en
  // orden ASC por kickoff (próximo más cerca primero), finalizados al final
  // en orden DESC (más reciente jugado primero). El filtro por fase se
  // aplica antes de la separación así el orden vale dentro de cada tab.
  const visibles = useMemo(() => {
    const filtrados =
      filtro === 'todos' ? partidos : partidos.filter((p) => p.fase === filtro)

    const pendientes: typeof filtrados = []
    const finalizados: typeof filtrados = []
    for (const p of filtrados) {
      if (p.estado === 'finalizado') finalizados.push(p)
      else pendientes.push(p)
    }

    pendientes.sort((a, b) =>
      a.fecha_hora_kickoff.localeCompare(b.fecha_hora_kickoff),
    )
    finalizados.sort((a, b) =>
      b.fecha_hora_kickoff.localeCompare(a.fecha_hora_kickoff),
    )

    return [...pendientes, ...finalizados]
  }, [filtro, partidos])

  if (partidos.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/40 px-6 py-16 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Sin partidos
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Apretá "Importar fixture" para traer los partidos de la API.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Tabs value={filtro} onValueChange={(v) => setFiltro(v as Filtro)}>
        <TabsList
          variant="line"
          className="flex w-full justify-start gap-1 overflow-x-auto"
        >
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {visibles.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-muted/40 px-6 py-12 text-center text-sm text-muted-foreground">
          No hay partidos en esta fase.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {visibles.map((p) => (
            <li key={p.id}>
              <AdminPartidoCard partido={p} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function AdminPartidoCard({ partido }: { partido: PartidoAdminItem }) {
  const finalizado = partido.estado === 'finalizado'
  const enCurso = partido.estado === 'en_curso'
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {formatearKickoff(partido.fecha_hora_kickoff)}
          <span className="mx-1.5 text-muted-foreground/40">·</span>
          api_id {partido.api_id}
        </span>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider',
            enCurso && 'bg-destructive/10 text-destructive',
            finalizado && 'bg-foreground/10 text-foreground/80',
            partido.estado === 'suspendido' &&
              'bg-muted text-muted-foreground',
            partido.estado === 'programado' &&
              'bg-muted text-muted-foreground',
          )}
        >
          {ESTADO_LABELS[partido.estado]}
        </span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <BanderaEquipo
          codigoPais={partido.equipo_local.codigo_pais}
          nombre={partido.equipo_local.nombre}
          size="md"
          className="min-w-0 flex-1"
        />
        <div className="flex items-baseline gap-2 font-mono text-2xl font-semibold tabular-nums leading-none">
          <span>{partido.marcador_local_real ?? '–'}</span>
          <span className="text-muted-foreground/40">·</span>
          <span>{partido.marcador_visitante_real ?? '–'}</span>
        </div>
        <BanderaEquipo
          codigoPais={partido.equipo_visitante.codigo_pais}
          nombre={partido.equipo_visitante.nombre}
          size="md"
          className="min-w-0 flex-1 flex-row-reverse text-right"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
        <ToggleHabilitadoButton
          partidoId={partido.id}
          habilitado={partido.habilitado_para_predecir}
        />
        <EditarResultadoDialog
          partidoId={partido.id}
          marcadorLocal={partido.marcador_local_real}
          marcadorVisitante={partido.marcador_visitante_real}
          estado={partido.estado}
          nombreLocal={partido.equipo_local.nombre}
          nombreVisitante={partido.equipo_visitante.nombre}
        />
        <a
          href={`/admin/partidos/${partido.id}`}
          className="ml-auto text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Bonus →
        </a>
      </div>
    </div>
  )
}
