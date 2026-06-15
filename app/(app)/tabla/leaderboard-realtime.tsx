'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { LeaderboardRow } from '@/lib/queries/dashboard'

interface LeaderboardRealtimeProps {
  filasIniciales: LeaderboardRow[]
  miUserId: string
}

export function LeaderboardRealtime({
  filasIniciales,
  miUserId,
}: LeaderboardRealtimeProps) {
  const [filas, setFilas] = useState<LeaderboardRow[]>(filasIniciales)
  // Null on first render to avoid SSR/client time mismatch — set in the
  // mount effect below and then updated on every realtime refetch.
  const [actualizadoEn, setActualizadoEn] = useState<Date | null>(null)
  const [conectado, setConectado] = useState<boolean>(false)

  useEffect(() => {
    const supabase = createClient()
    // Set the initial timestamp after mount so SSR/CSR agree.
    setActualizadoEn(new Date())

    const refetch = async () => {
      const { data, error } = await supabase
        .from('leaderboard')
        .select(
          'usuario_id, nombre, foto_url, puntos_totales, marcadores_exactos, puntos_bonus',
        )
      if (error) {
        console.error('[tabla] refetch failed:', error)
        return
      }
      setFilas(
        (data ?? []).map((r) => ({
          usuario_id: r.usuario_id ?? '',
          nombre: r.nombre ?? '',
          foto_url: r.foto_url,
          puntos: r.puntos_totales ?? 0,
          marcadores_exactos: r.marcadores_exactos ?? 0,
          puntos_bonus: r.puntos_bonus ?? 0,
        })),
      )
      setActualizadoEn(new Date())
    }

    const channel = supabase
      .channel('leaderboard-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'predicciones_partido' },
        refetch,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'predicciones_bonus' },
        refetch,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'predicciones_torneo' },
        refetch,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'partidos' },
        refetch,
      )
      .subscribe((status) => {
        setConectado(status === 'SUBSCRIBED')
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <div className="flex flex-col gap-3">
      <LeaderboardTable filas={filas} miUserId={miUserId} />
      <p className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
        <span
          aria-hidden="true"
          className={cn(
            'size-1.5 rounded-full',
            conectado
              ? 'bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.15)]'
              : 'bg-muted-foreground/40',
          )}
        />
        {conectado ? 'En vivo' : 'Conectando'}
        {actualizadoEn && (
          <>
            <span className="text-muted-foreground/50">·</span>
            Actualizado{' '}
            {actualizadoEn.toLocaleTimeString('es', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </>
        )}
      </p>
    </div>
  )
}

function LeaderboardTable({
  filas,
  miUserId,
}: {
  filas: LeaderboardRow[]
  miUserId: string
}) {
  if (filas.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/40 px-6 py-16 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Sin participantes
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Cuando se sumen jugadores, los vas a ver acá.
        </p>
      </div>
    )
  }

  // Grid: [#] [name flex] [Exactos] [Bonus] [Puntos]. Tighter widths on
  // mobile so the name column keeps usable width on a 375px viewport.
  const grid =
    'grid grid-cols-[1.5rem_1fr_2.25rem_2.25rem_3rem] sm:grid-cols-[2rem_1fr_4rem_4rem_4.5rem] items-center gap-3'

  return (
    <ol className="overflow-hidden rounded-2xl border border-border bg-card">
      <li
        className={cn(
          grid,
          'border-b border-border bg-muted/40 px-4 py-2 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground',
        )}
      >
        <span>#</span>
        <span>Participante</span>
        <span className="text-right" aria-label="Marcadores exactos">
          <span className="sm:hidden">Ex.</span>
          <span className="hidden sm:inline">Exactos</span>
        </span>
        <span className="text-right" aria-label="Puntos por preguntas bonus">
          <span className="sm:hidden">B.</span>
          <span className="hidden sm:inline">Bonus</span>
        </span>
        <span className="text-right">Puntos</span>
      </li>
      {filas.map((row, i) => {
        const mia = row.usuario_id === miUserId
        return (
          <li
            key={row.usuario_id}
            className={cn(
              grid,
              'border-b border-border/60 px-4 py-3 last:border-b-0',
              mia && 'bg-accent/40',
            )}
          >
            <span
              className={cn(
                'font-mono text-sm tabular-nums',
                i === 0 ? 'font-semibold text-foreground' : 'text-muted-foreground',
              )}
            >
              {i + 1}
            </span>
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate text-sm font-medium text-foreground">
                {row.nombre}
              </span>
              {mia && (
                <span className="shrink-0 rounded-full bg-foreground px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-background">
                  Tú
                </span>
              )}
            </span>
            <span className="text-right font-mono text-sm tabular-nums text-foreground">
              {row.marcadores_exactos}
            </span>
            <span className="text-right font-mono text-sm tabular-nums text-foreground">
              {row.puntos_bonus}
            </span>
            <span className="text-right font-mono text-base font-semibold tabular-nums text-foreground">
              {row.puntos}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
