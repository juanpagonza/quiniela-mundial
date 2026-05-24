import Link from 'next/link'
import { requireAdmin } from '@/lib/auth/admin'
import {
  obtenerAjustes,
  obtenerUsuariosParaAjustes,
} from '@/lib/queries/ajustes'
import { FormularioAjuste } from '@/components/admin/formulario-ajuste'
import { ChevronLeftIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export default async function AdminAjustesPage() {
  const { supabase } = await requireAdmin()

  const [usuarios, ajustes] = await Promise.all([
    obtenerUsuariosParaAjustes(supabase),
    obtenerAjustes(supabase),
  ])

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
          Admin · Ajustes manuales
        </p>
        <h1 className="mt-1 font-display text-3xl font-medium leading-tight tracking-tight text-foreground sm:text-4xl">
          Ajustes de puntos
        </h1>
        <p className="mt-2 max-w-prose text-sm text-muted-foreground">
          Sumá o restá puntos sueltos a un participante. Los ajustes se
          aplican a la tabla en tiempo real y aparecen en su historial. Cada
          ajuste queda registrado con el motivo.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl font-medium text-foreground">
          Nuevo ajuste
        </h2>
        <FormularioAjuste usuarios={usuarios} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl font-medium text-foreground">
          Historial
        </h2>
        {ajustes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/40 px-6 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              Aún no se aplicó ningún ajuste.
            </p>
          </div>
        ) : (
          <ul className="overflow-hidden rounded-2xl border border-border bg-card divide-y divide-border">
            {ajustes.map((a) => (
              <li key={a.id} className="flex flex-col gap-1 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {a.usuario_nombre}
                  </span>
                  <span
                    className={cn(
                      'font-mono text-sm font-semibold tabular-nums',
                      a.puntos > 0 ? 'text-foreground' : 'text-destructive',
                    )}
                  >
                    {a.puntos > 0 ? `+${a.puntos}` : a.puntos} pts
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{a.motivo}</p>
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
                  Por {a.admin_nombre} ·{' '}
                  {new Date(a.created_at).toLocaleString('es', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
