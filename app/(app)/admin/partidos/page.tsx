import Link from 'next/link'
import { requireAdmin } from '@/lib/auth/admin'
import { obtenerPartidosAdmin } from '@/lib/queries/admin-partidos'
import { AdminPartidosList } from '@/components/admin/admin-partidos-list'
import { ImportarFixtureButton } from '@/components/admin/importar-fixture-button'
import { ChevronLeftIcon } from 'lucide-react'

export default async function AdminPartidosListPage() {
  const { supabase } = await requireAdmin()
  const partidos = await obtenerPartidosAdmin(supabase)

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin"
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeftIcon className="size-4" aria-hidden="true" />
        Volver al admin
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Admin · {partidos.length}{' '}
            {partidos.length === 1 ? 'partido' : 'partidos'}
          </p>
          <h1 className="mt-1 font-display text-3xl font-medium leading-tight tracking-tight text-foreground sm:text-4xl">
            Partidos
          </h1>
        </div>
        <ImportarFixtureButton />
      </div>

      <AdminPartidosList partidos={partidos} />
    </div>
  )
}
