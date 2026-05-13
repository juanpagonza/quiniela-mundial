import Link from 'next/link'
import { cn } from '@/lib/utils'
import { ArrowRightIcon } from 'lucide-react'
import type { LeaderboardRow } from '@/lib/queries/dashboard'

interface MiniLeaderboardProps {
  filas: LeaderboardRow[]
  miUserId: string
}

export function MiniLeaderboard({ filas, miUserId }: MiniLeaderboardProps) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-medium text-foreground">
          Top 5
        </h2>
        <Link
          href="/tabla"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Ver tabla
          <ArrowRightIcon className="size-3" aria-hidden="true" />
        </Link>
      </div>

      {filas.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Sin participantes todavía.
        </p>
      ) : (
        <ol className="divide-y divide-border">
          {filas.map((row, i) => {
            const mia = row.usuario_id === miUserId
            return (
              <li
                key={row.usuario_id}
                className={cn(
                  '-mx-2 flex items-center gap-3 rounded-md px-2 py-2',
                  mia && 'bg-accent/40',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'inline-flex size-6 shrink-0 items-center justify-center font-mono text-xs font-medium tabular-nums',
                    i === 0
                      ? 'text-foreground'
                      : 'text-muted-foreground',
                  )}
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                  {row.nombre}
                  {mia && (
                    <span className="ml-2 rounded-full bg-foreground px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-background">
                      Tú
                    </span>
                  )}
                </span>
                <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                  {row.puntos}
                </span>
                <span className="text-xs text-muted-foreground">pts</span>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
