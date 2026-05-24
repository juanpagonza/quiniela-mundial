import Link from 'next/link'
import { requireAdmin } from '@/lib/auth/admin'
import { mundialIniciado } from '@/lib/queries/torneo'
import { FormularioConfiguracion } from '@/components/admin/formulario-configuracion'
import { ChevronLeftIcon } from 'lucide-react'

export default async function AdminConfiguracionPage() {
  const { supabase } = await requireAdmin()

  const [{ data: config }, locked] = await Promise.all([
    supabase
      .from('configuracion')
      .select(
        'puntos_marcador_exacto, puntos_solo_ganador, puntos_campeon, puntos_subcampeon, puntos_goleador, goleador_oficial',
      )
      .eq('id', 1)
      .single(),
    mundialIniciado(supabase),
  ])

  if (!config) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/40 px-6 py-12 text-center">
        <p className="text-sm text-muted-foreground">
          No se encontró la fila de configuración. Algo está mal con la BD.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin"
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeftIcon className="size-4" aria-hidden="true" />
        Volver al admin
      </Link>

      <div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Admin · Configuración
        </p>
        <h1 className="mt-1 font-display text-3xl font-medium leading-tight tracking-tight text-foreground sm:text-4xl">
          Sistema de puntos
        </h1>
      </div>

      <FormularioConfiguracion actual={config} locked={locked} />
    </div>
  )
}
