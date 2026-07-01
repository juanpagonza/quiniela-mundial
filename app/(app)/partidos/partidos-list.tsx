'use client'

import { useEffect, useMemo, useState } from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PartidoCard } from '@/components/partido-card'
import type { PartidoConPrediccion } from '@/lib/queries/partidos'
import type { FasePartido } from '@/lib/supabase/types'

type FaseFiltro = 'todos' | FasePartido
type SectionFiltro = 'por_jugar' | 'resultados'

const FASE_TAB_ORDER: Array<{ value: FaseFiltro; label: string }> = [
  { value: 'todos', label: 'Todos' },
  { value: 'grupos', label: 'Grupos' },
  { value: 'dieciseisavos', label: '16avos' },
  { value: 'octavos', label: 'Octavos' },
  { value: 'cuartos', label: 'Cuartos' },
  { value: 'semis', label: 'Semis' },
  { value: 'tercer_puesto', label: '3er' },
  { value: 'final', label: 'Final' },
]

interface PartidosListProps {
  partidos: PartidoConPrediccion[]
}

// Deciding whether a partido belongs to "Por jugar" vs "Resultados". Estado
// is authoritative (finalizado + en_curso = never por-jugar), but the DB may
// lag briefly around kickoff, so we also treat kickoff <= now as "started"
// once we have a client-side timestamp. On the SSR pass and first client
// render nowMs is null so we fall back to estado only — that keeps the two
// renders identical and avoids a hydration mismatch.
function isPorJugar(p: PartidoConPrediccion, nowMs: number | null): boolean {
  if (p.estado === 'finalizado' || p.estado === 'en_curso') return false
  if (nowMs !== null && new Date(p.fecha_hora_kickoff).getTime() <= nowMs) {
    return false
  }
  return true
}

export function PartidosList({ partidos }: PartidosListProps) {
  const [seccion, setSeccion] = useState<SectionFiltro>('por_jugar')
  const [filtro, setFiltro] = useState<FaseFiltro>('todos')

  // Refresh the "now" reference once per minute so a partido crossing the
  // kickoff boundary doesn't need a page reload to move sections.
  const [nowMs, setNowMs] = useState<number | null>(null)
  useEffect(() => {
    setNowMs(Date.now())
    const id = setInterval(() => setNowMs(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])

  // Split the whole set once by section. Later steps only re-filter by fase.
  const [porJugarTodos, resultadosTodos] = useMemo(() => {
    const pj: PartidoConPrediccion[] = []
    const res: PartidoConPrediccion[] = []
    for (const p of partidos) {
      if (isPorJugar(p, nowMs)) pj.push(p)
      else res.push(p)
    }
    // Por jugar: ASC (siguiente más cerca primero).
    pj.sort((a, b) =>
      a.fecha_hora_kickoff.localeCompare(b.fecha_hora_kickoff),
    )
    // Resultados: DESC (más reciente primero).
    res.sort((a, b) =>
      b.fecha_hora_kickoff.localeCompare(a.fecha_hora_kickoff),
    )
    return [pj, res]
  }, [partidos, nowMs])

  const seccionPartidos =
    seccion === 'por_jugar' ? porJugarTodos : resultadosTodos

  // Fase tabs are scoped to the current section — no point offering "Grupos"
  // in "Por jugar" once every group match has finalized.
  const fasesPresentes = useMemo(() => {
    const set = new Set<FasePartido>()
    for (const p of seccionPartidos) set.add(p.fase)
    return set
  }, [seccionPartidos])

  const faseTabs = useMemo(
    () =>
      FASE_TAB_ORDER.filter(
        (t) => t.value === 'todos' || fasesPresentes.has(t.value),
      ),
    [fasesPresentes],
  )

  // If the currently-selected fase disappears (e.g. user was on Grupos in
  // Resultados and all group matches drift into a different section), quietly
  // reset to Todos so we don't render an empty tab.
  useEffect(() => {
    if (filtro !== 'todos' && !fasesPresentes.has(filtro)) {
      setFiltro('todos')
    }
  }, [filtro, fasesPresentes])

  const visibles = useMemo(
    () =>
      filtro === 'todos'
        ? seccionPartidos
        : seccionPartidos.filter((p) => p.fase === filtro),
    [seccion, seccionPartidos, filtro],
  )

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

  const seccionVacia = seccionPartidos.length === 0

  return (
    <div className="flex flex-col gap-4">
      <Tabs
        value={seccion}
        onValueChange={(v) => {
          setSeccion(v as SectionFiltro)
          setFiltro('todos')
        }}
      >
        <TabsList className="w-full">
          <TabsTrigger value="por_jugar" className="flex-1">
            Por jugar
            <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
              {porJugarTodos.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="resultados" className="flex-1">
            Resultados
            <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
              {resultadosTodos.length}
            </span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {seccionVacia ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/40 px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            {seccion === 'por_jugar'
              ? 'No hay partidos por jugar.'
              : 'Todavía no hay resultados.'}
          </p>
        </div>
      ) : (
        <>
          <Tabs
            value={filtro}
            onValueChange={(v) => setFiltro(v as FaseFiltro)}
          >
            <TabsList
              variant="line"
              className="flex w-full justify-start gap-1 overflow-x-auto"
            >
              {faseTabs.map((t) => (
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
        </>
      )}
    </div>
  )
}
