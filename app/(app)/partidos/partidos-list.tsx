'use client'

import { useMemo, useState } from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PartidoCard } from '@/components/partido-card'
import type { PartidoConPrediccion } from '@/lib/queries/partidos'
import type { FasePartido } from '@/lib/supabase/types'

type Filtro = 'todos' | FasePartido

const TAB_ORDER: Array<{ value: Filtro; label: string }> = [
  { value: 'todos', label: 'Todos' },
  { value: 'grupos', label: 'Grupos' },
  { value: 'octavos', label: 'Octavos' },
  { value: 'cuartos', label: 'Cuartos' },
  { value: 'semis', label: 'Semis' },
  { value: 'tercer_puesto', label: '3er' },
  { value: 'final', label: 'Final' },
]

interface PartidosListProps {
  partidos: PartidoConPrediccion[]
}

export function PartidosList({ partidos }: PartidosListProps) {
  const [filtro, setFiltro] = useState<Filtro>('todos')

  // Only show fase tabs that actually have at least one match.
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

  // Two-group order: non-finalizado partidos (programados / en curso) go up
  // top sorted ASC by kickoff (closest upcoming first); finalizados drop to
  // the bottom sorted DESC (most recently played first, since older matches
  // matter less to most readers). Filtering by fase is applied first so the
  // sort happens within the visible subset.
  const visibles = useMemo(() => {
    const filtrados =
      filtro === 'todos' ? partidos : partidos.filter((p) => p.fase === filtro)

    const pendientes: PartidoConPrediccion[] = []
    const finalizados: PartidoConPrediccion[] = []
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
          Cuando el admin importe el fixture, los partidos aparecen acá.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <Tabs
        value={filtro}
        onValueChange={(v) => setFiltro(v as Filtro)}
      >
        <TabsList variant="line" className="flex w-full justify-start gap-1 overflow-x-auto">
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
        <div className="flex flex-col gap-3">
          {visibles.map((p) => (
            <PartidoCard key={p.id} partido={p} />
          ))}
        </div>
      )}
    </div>
  )
}
