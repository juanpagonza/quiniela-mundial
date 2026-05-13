import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { obtenerPartidosConPrediccion } from '@/lib/queries/partidos'
import { PartidosList } from './partidos-list'

export default async function PartidosPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const partidos = await obtenerPartidosConPrediccion(supabase, user.id)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Fixture
        </p>
        <h1 className="mt-1 font-display text-3xl font-medium leading-tight tracking-tight text-foreground sm:text-4xl">
          Partidos
        </h1>
      </div>
      <PartidosList partidos={partidos} />
    </div>
  )
}
