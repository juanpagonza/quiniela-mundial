import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  contarPrediccionesPendientes,
  obtenerLeaderboard,
  obtenerProximoPartido,
} from '@/lib/queries/dashboard'
import { obtenerBonusPendientes } from '@/lib/queries/preguntas-bonus'
import { ProximoPartido } from '@/components/proximo-partido'
import { MiniLeaderboard } from '@/components/mini-leaderboard'
import { RecordatorioBonusModal } from '@/components/recordatorio-bonus-modal'
import { ArrowRightIcon, TrophyIcon } from 'lucide-react'

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('nombre')
    .eq('id', user.id)
    .single()

  const primerNombre = (usuario?.nombre ?? '').split(' ')[0]

  const [proximo, leaderboard, pendientes, bonusPendientes] = await Promise.all([
    obtenerProximoPartido(supabase, user.id),
    obtenerLeaderboard(supabase, 5),
    contarPrediccionesPendientes(supabase, user.id),
    obtenerBonusPendientes(supabase, user.id),
  ])

  return (
    <div className="flex flex-col gap-6">
      {bonusPendientes.length > 0 && (
        <RecordatorioBonusModal bonusPendientes={bonusPendientes} />
      )}

      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Hola{primerNombre ? `, ${primerNombre}` : ''}
        </p>
        <h1 className="font-display text-3xl font-medium leading-tight tracking-tight text-foreground sm:text-4xl">
          {proximo
            ? 'Te esperamos en la quiniela.'
            : 'La quiniela arranca pronto.'}
        </h1>
      </div>

      {proximo && <ProximoPartido partido={proximo} />}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link
          href="/partidos"
          className="group flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-5 transition-all hover:border-foreground/30 hover:shadow-sm"
        >
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Pendientes
            </span>
            <span className="font-display text-3xl font-medium leading-none text-foreground">
              {pendientes}
            </span>
            <span className="text-sm text-muted-foreground">
              {pendientes === 1
                ? 'partido por predecir'
                : 'partidos por predecir'}
            </span>
          </div>
          <ArrowRightIcon
            className="size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
            aria-hidden="true"
          />
        </Link>

        <Link
          href="/mi-quiniela"
          className="group flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-5 transition-all hover:border-foreground/30 hover:shadow-sm"
        >
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Mi quiniela del Mundial
            </span>
            <span className="font-display text-base font-medium text-foreground">
              Campeón, subcampeón y goleador
            </span>
            <span className="text-sm text-muted-foreground">
              Editable hasta el primer partido.
            </span>
          </div>
          <TrophyIcon
            className="size-5 text-muted-foreground transition-colors group-hover:text-foreground"
            aria-hidden="true"
          />
        </Link>
      </div>

      <MiniLeaderboard filas={leaderboard} miUserId={user.id} />
    </div>
  )
}
