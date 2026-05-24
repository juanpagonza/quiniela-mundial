import Link from 'next/link'
import { ChevronLeftIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { requireAdmin } from '@/lib/auth/admin'
import {
  obtenerAdminsLog,
  obtenerLogAuditoria,
  type LogItem,
} from '@/lib/queries/auditoria'
import {
  ACCION_LABELS,
  AuditoriaFiltros,
} from '@/components/admin/auditoria-filtros'
import { cn } from '@/lib/utils'
import type { AccionAuditoria, Json } from '@/lib/supabase/types'

const PAGE_SIZE = 25

const ACCION_VALUES = new Set<AccionAuditoria>(
  Object.keys(ACCION_LABELS) as AccionAuditoria[],
)

export default async function AdminAuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{
    accion?: string
    admin?: string
    desde?: string
    hasta?: string
    page?: string
  }>
}) {
  const { supabase } = await requireAdmin()
  const params = await searchParams

  const accionRaw = params.accion?.trim() || null
  const accion =
    accionRaw && ACCION_VALUES.has(accionRaw as AccionAuditoria)
      ? (accionRaw as AccionAuditoria)
      : null
  const adminId = params.admin?.trim() || null
  const desde = isValidDate(params.desde) ? params.desde! : null
  const hasta = isValidDate(params.hasta) ? params.hasta! : null
  const page = Math.max(1, Number(params.page ?? '1') || 1)

  const filtros = { accion, adminId, desde, hasta }
  const [{ items, total }, admins] = await Promise.all([
    obtenerLogAuditoria(supabase, filtros, page, PAGE_SIZE),
    obtenerAdminsLog(supabase),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const filtroQs = buildFilterQs({ accion, adminId, desde, hasta })

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
          Admin · Auditoría
        </p>
        <h1 className="mt-1 font-display text-3xl font-medium leading-tight tracking-tight text-foreground sm:text-4xl">
          Log de cambios
        </h1>
        <p className="mt-2 max-w-prose text-sm text-muted-foreground">
          Toda acción del admin que modifica datos queda registrada acá.
          Cada fila se puede expandir para ver el valor anterior y el nuevo.
        </p>
      </div>

      <AuditoriaFiltros
        admins={admins}
        filtros={{
          accion: accion,
          adminId,
          desde,
          hasta,
        }}
      />

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-display text-xl font-medium text-foreground">
            Historial
          </h2>
          <p className="text-xs text-muted-foreground">
            {total} entrada{total === 1 ? '' : 's'}
            {total > 0 && (
              <>
                <span className="mx-1.5 text-muted-foreground/40">·</span>
                Página {page} de {totalPages}
              </>
            )}
          </p>
        </div>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/40 px-6 py-16 text-center">
            <p className="text-sm text-muted-foreground">
              No hay registros que coincidan con esos filtros.
            </p>
          </div>
        ) : (
          <ul className="overflow-hidden rounded-2xl border border-border bg-card divide-y divide-border">
            {items.map((item) => (
              <li key={item.id}>
                <FilaLog item={item} />
              </li>
            ))}
          </ul>
        )}

        {totalPages > 1 && (
          <Paginacion
            page={page}
            totalPages={totalPages}
            filtroQs={filtroQs}
          />
        )}
      </section>
    </div>
  )
}

function FilaLog({ item }: { item: LogItem }) {
  const fecha = new Date(item.fecha).toLocaleString('es', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
  return (
    <details className="group">
      <summary className="flex cursor-pointer list-none items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/40">
        <span className="mt-0.5 text-muted-foreground/60 transition-transform group-open:rotate-90">
          ▸
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="font-medium text-foreground">
              {ACCION_LABELS[item.accion]}
            </span>
            <span className="text-muted-foreground/40">·</span>
            <span className="text-muted-foreground">{item.entidad_tipo}</span>
            {item.entidad_id && (
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                {item.entidad_id.slice(0, 8)}
              </code>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
            <span>{fecha}</span>
            <span className="text-muted-foreground/40">·</span>
            <span>Por {item.admin_nombre}</span>
            {item.motivo && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span className="italic">{item.motivo}</span>
              </>
            )}
          </div>
        </div>
      </summary>
      <div className="grid grid-cols-1 gap-3 border-t border-border/60 bg-muted/30 px-4 py-3 sm:grid-cols-2">
        <DiffCol
          label="Antes"
          value={item.valor_anterior}
          tone="muted"
        />
        <DiffCol
          label="Después"
          value={item.valor_nuevo}
          tone="primary"
        />
      </div>
    </details>
  )
}

function DiffCol({
  label,
  value,
  tone,
}: {
  label: string
  value: Json | null
  tone: 'muted' | 'primary'
}) {
  return (
    <div className="flex flex-col gap-1">
      <span
        className={cn(
          'text-[10px] font-medium uppercase tracking-[0.16em]',
          tone === 'primary' ? 'text-foreground/80' : 'text-muted-foreground',
        )}
      >
        {label}
      </span>
      <pre
        className={cn(
          'overflow-x-auto rounded-lg border border-border/40 bg-background/60 p-3 font-mono text-[11px] leading-relaxed',
          tone === 'primary' ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        {value == null ? '—' : JSON.stringify(value, null, 2)}
      </pre>
    </div>
  )
}

function Paginacion({
  page,
  totalPages,
  filtroQs,
}: {
  page: number
  totalPages: number
  filtroQs: string
}) {
  const prevDisabled = page <= 1
  const nextDisabled = page >= totalPages
  const linkBase = filtroQs ? `/admin/auditoria?${filtroQs}` : '/admin/auditoria'
  const linkFor = (n: number) =>
    `${linkBase}${filtroQs ? '&' : '?'}page=${n}`

  return (
    <nav className="flex items-center justify-center gap-2 pt-1">
      <Link
        href={prevDisabled ? '#' : linkFor(page - 1)}
        aria-disabled={prevDisabled}
        className={cn(
          'inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-sm transition-colors',
          prevDisabled
            ? 'pointer-events-none opacity-40'
            : 'hover:bg-accent hover:text-accent-foreground',
        )}
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Anterior
      </Link>
      <span className="text-xs text-muted-foreground">
        {page} / {totalPages}
      </span>
      <Link
        href={nextDisabled ? '#' : linkFor(page + 1)}
        aria-disabled={nextDisabled}
        className={cn(
          'inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-sm transition-colors',
          nextDisabled
            ? 'pointer-events-none opacity-40'
            : 'hover:bg-accent hover:text-accent-foreground',
        )}
      >
        Siguiente
        <ChevronRight className="size-4" aria-hidden="true" />
      </Link>
    </nav>
  )
}

function isValidDate(d: string | undefined): boolean {
  if (!d) return false
  return /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(new Date(d).getTime())
}

function buildFilterQs(filtros: {
  accion: AccionAuditoria | null
  adminId: string | null
  desde: string | null
  hasta: string | null
}): string {
  const params = new URLSearchParams()
  if (filtros.accion) params.set('accion', filtros.accion)
  if (filtros.adminId) params.set('admin', filtros.adminId)
  if (filtros.desde) params.set('desde', filtros.desde)
  if (filtros.hasta) params.set('hasta', filtros.hasta)
  return params.toString()
}
