'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type {
  AccionAuditoria,
} from '@/lib/supabase/types'
import type { AdminMini } from '@/lib/queries/auditoria'

const ACCION_LABELS: Record<AccionAuditoria, string> = {
  editar_prediccion_partido: 'Editar predicción partido',
  editar_prediccion_bonus: 'Editar predicción bonus',
  ajuste_puntos_manual: 'Ajuste manual',
  editar_resultado_partido: 'Editar resultado',
  editar_config: 'Editar configuración',
  habilitar_partido: 'Habilitar/ocultar partido',
  crear_pregunta_bonus: 'Crear pregunta bonus',
  editar_pregunta_bonus: 'Editar pregunta bonus',
  eliminar_pregunta_bonus: 'Eliminar pregunta bonus',
}

const ACCIONES = Object.keys(ACCION_LABELS) as AccionAuditoria[]

interface Props {
  admins: AdminMini[]
  filtros: {
    accion: string | null
    adminId: string | null
    desde: string | null
    hasta: string | null
  }
}

/**
 * Filter bar for /admin/auditoria. Each change pushes a new URL — the
 * server component re-renders with the filtered slice. useTransition
 * keeps the form responsive while the new fetch flies.
 *
 * We always reset to page=1 when a filter changes because page N from
 * the unfiltered set usually doesn't correspond to anything sensible
 * in the filtered set.
 */
export function AuditoriaFiltros({ admins, filtros }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()

  function actualizar(patch: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(patch)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    params.delete('page') // any filter change resets pagination
    const qs = params.toString()
    startTransition(() => {
      router.push(qs ? `/admin/auditoria?${qs}` : '/admin/auditoria')
    })
  }

  return (
    <div className="grid grid-cols-1 gap-4 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2 lg:grid-cols-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filtro-accion">Acción</Label>
        <select
          id="filtro-accion"
          value={filtros.accion ?? ''}
          onChange={(e) => actualizar({ accion: e.target.value || null })}
          disabled={pending}
          className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="">Todas</option>
          {ACCIONES.map((a) => (
            <option key={a} value={a}>
              {ACCION_LABELS[a]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filtro-admin">Admin</Label>
        <select
          id="filtro-admin"
          value={filtros.adminId ?? ''}
          onChange={(e) => actualizar({ admin: e.target.value || null })}
          disabled={pending}
          className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="">Todos</option>
          {admins.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filtro-desde">Desde</Label>
        <Input
          id="filtro-desde"
          type="date"
          value={filtros.desde ?? ''}
          onChange={(e) => actualizar({ desde: e.target.value || null })}
          disabled={pending}
          className="h-9"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filtro-hasta">Hasta</Label>
        <Input
          id="filtro-hasta"
          type="date"
          value={filtros.hasta ?? ''}
          onChange={(e) => actualizar({ hasta: e.target.value || null })}
          disabled={pending}
          className="h-9"
        />
      </div>

      {(filtros.accion || filtros.adminId || filtros.desde || filtros.hasta) && (
        <div className="sm:col-span-2 lg:col-span-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() =>
              actualizar({
                accion: null,
                admin: null,
                desde: null,
                hasta: null,
              })
            }
          >
            Limpiar filtros
          </Button>
        </div>
      )}
    </div>
  )
}

export { ACCION_LABELS }
