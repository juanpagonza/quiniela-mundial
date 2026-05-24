'use client'

import { useActionState, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { editarPrediccionPartidoAdmin } from '@/lib/actions/admin-predicciones'
import { INITIAL_ADMIN_PREDICCION_STATE } from '@/lib/admin-predicciones-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { PrediccionPartidoAdmin } from '@/lib/queries/admin-predicciones'

interface Props {
  usuarioId: string
  partidoId: string
  prediccion: PrediccionPartidoAdmin
  nombreLocal: string
  nombreVisitante: string
  marcadorRealLocal: number | null
  marcadorRealVisitante: number | null
  partidoFinalizado: boolean
}

/**
 * Admin-only editor for one user's marcador prediction. Controlled inputs
 * because the parent revalidates after each save — Base UI complains about
 * uncontrolled→controlled flips otherwise.
 *
 * The parent renders us with `key={usuarioId + '_' + partidoId}`, so React
 * remounts the component (and the useState re-initializes from the new
 * props) whenever the picker changes. That's the React 19 idiom for
 * "reset state when a prop changes" — no setState-in-effect needed.
 */
export function FormularioPrediccionPartidoAdmin({
  usuarioId,
  partidoId,
  prediccion,
  nombreLocal,
  nombreVisitante,
  marcadorRealLocal,
  marcadorRealVisitante,
  partidoFinalizado,
}: Props) {
  const [state, formAction, pending] = useActionState(
    editarPrediccionPartidoAdmin,
    INITIAL_ADMIN_PREDICCION_STATE,
  )

  const [local, setLocal] = useState<string>(
    prediccion.marcador_local != null ? String(prediccion.marcador_local) : '',
  )
  const [visit, setVisit] = useState<string>(
    prediccion.marcador_visitante != null
      ? String(prediccion.marcador_visitante)
      : '',
  )

  useEffect(() => {
    if (!state.result) return
    if (state.result.success) {
      toast.success(state.result.message ?? 'Guardado')
    } else {
      toast.error(state.result.error)
    }
  }, [state.result])

  const sinPrediccion = prediccion.id == null

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5"
    >
      <input type="hidden" name="usuarioId" value={usuarioId} />
      <input type="hidden" name="partidoId" value={partidoId} />

      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-lg font-medium text-foreground">
          Marcador
        </h3>
        <div className="flex items-center gap-2 text-xs">
          {partidoFinalizado &&
            marcadorRealLocal != null &&
            marcadorRealVisitante != null && (
              <span className="font-mono text-muted-foreground">
                Real:{' '}
                <span className="font-semibold text-foreground">
                  {marcadorRealLocal} – {marcadorRealVisitante}
                </span>
              </span>
            )}
          {prediccion.editado_por_admin && (
            <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-foreground/80">
              Editado por admin
            </span>
          )}
        </div>
      </div>

      {sinPrediccion && (
        <p className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Este participante no predijo este partido. Al guardar se crea la
          predicción marcada como editada por admin.
        </p>
      )}

      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="prediccion-local" className="truncate">
            {nombreLocal}
          </Label>
          <Input
            id="prediccion-local"
            name="marcadorLocal"
            type="number"
            inputMode="numeric"
            min={0}
            max={20}
            step={1}
            required
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            disabled={pending}
            className="text-center font-mono text-2xl tabular-nums"
          />
        </div>
        <span className="pb-2 text-muted-foreground/50">–</span>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="prediccion-visitante" className="truncate text-right">
            {nombreVisitante}
          </Label>
          <Input
            id="prediccion-visitante"
            name="marcadorVisitante"
            type="number"
            inputMode="numeric"
            min={0}
            max={20}
            step={1}
            required
            value={visit}
            onChange={(e) => setVisit(e.target.value)}
            disabled={pending}
            className="text-center font-mono text-2xl tabular-nums"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-3">
        <span className="text-xs text-muted-foreground">
          Puntos actuales:{' '}
          <span className="font-mono font-semibold tabular-nums text-foreground">
            {prediccion.puntos_obtenidos}
          </span>
        </span>
        <Button type="submit" size="sm" disabled={pending} aria-busy={pending}>
          {pending ? 'Guardando...' : 'Guardar marcador'}
        </Button>
      </div>
    </form>
  )
}
