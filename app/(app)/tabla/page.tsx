import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { obtenerLeaderboard } from '@/lib/queries/dashboard'
import { LeaderboardRealtime } from './leaderboard-realtime'

export default async function TablaPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const filas = await obtenerLeaderboard(supabase)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {filas.length === 1
            ? '1 participante'
            : `${filas.length} participantes`}
        </p>
        <h1 className="mt-1 font-display text-3xl font-medium leading-tight tracking-tight text-foreground sm:text-4xl">
          Tabla de posiciones
        </h1>
      </div>

      <LeaderboardRealtime filasIniciales={filas} miUserId={user.id} />
    </div>
  )
}
