'use client'

import { useActionState, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { editarPrediccionBonusAdmin } from '@/lib/actions/admin-predicciones'
import { INITIAL_ADMIN_PREDICCION_STATE } from '@/lib/admin-predicciones-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { PrediccionBonusAdmin } from '@/lib/queries/admin-predicciones'

interface Props {
  usuarioId: string
  partidoId: string
  bonus: PrediccionBonusAdmin
}

/**
 * Per-bonus-question editor mirroring the admin's setear-respuesta-bonus
 * UI but writing to predicciones_bonus instead of preguntas_bonus. Each
 * question gets its own form with its own action state so save spinners
 * don't bleed across rows.
 */
export function FormularioPrediccionBonusAdmin({
  usuarioId,
  partidoId,
  bonus,
}: Props) {
  const [state, formAction, pending] = useActionState(
    editarPrediccionBonusAdmin,
    INITIAL_ADMIN_PREDICCION_STATE,
  )

  // The parent renders us inside a list keyed by pregunta_id and remounts
  // the page when the picker changes, so useState resetting on mount is
  // enough — no setState-in-effect needed.
  const [value, setValue] = useState<string>(jsonToInputValue(bonus.respuesta))

  useEffect(() => {
    if (!state.result) return
    if (state.result.success) {
      toast.success(state.result.message ?? 'Guardado')
    } else {
      toast.error(state.result.error)
    }
  }, [state.result])

  const respuestaCorrecta = jsonToInputValue(bonus.respuesta_correcta)
  const acertada =
    respuestaCorrecta !== '' && value !== '' && value === respuestaCorrecta

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5"
    >
      <input type="hidden" name="usuarioId" value={usuarioId} />
      <input type="hidden" name="partidoId" value={partidoId} />
      <input type="hidden" name="preguntaBonusId" value={bonus.pregunta_id} />
      <input type="hidden" name="tipo" value={bonus.tipo} />
      {bonus.opciones && (
        <input
          type="hidden"
          name="opciones"
          value={JSON.stringify(bonus.opciones)}
        />
      )}
      <input type="hidden" name="respuesta" value={value} />

      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-foreground">
            {bonus.enunciado}
          </p>
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Vale {bonus.puntos} pts
            {respuestaCorrecta && (
              <>
                <span className="mx-1 text-muted-foreground/40">·</span>
                Correcta: <span className="text-foreground/80">{respuestaCorrecta}</span>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 text-xs">
          {bonus.editado_por_admin && (
            <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-foreground/80">
              Editado
            </span>
          )}
          {bonus.puntos_obtenidos > 0 && (
            <span
              className={
                'font-mono font-semibold tabular-nums ' +
                (acertada ? 'text-foreground' : 'text-muted-foreground')
              }
            >
              +{bonus.puntos_obtenidos}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {bonus.tipo === 'numero' && (
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            max={99}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={pending}
            className="h-9 w-24 text-center font-mono tabular-nums"
          />
        )}

        {bonus.tipo === 'over_under' && (
          <BinaryToggle
            options={['over', 'under']}
            labels={{ over: 'Más', under: 'Menos' }}
            value={value}
            onChange={setValue}
            disabled={pending}
          />
        )}

        {bonus.tipo === 'si_no' && (
          <BinaryToggle
            options={['si', 'no']}
            labels={{ si: 'Sí', no: 'No' }}
            value={value}
            onChange={setValue}
            disabled={pending}
          />
        )}

        {bonus.tipo === 'opcion_multiple' && bonus.opciones && (
          <select
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={pending}
            className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="">Elegir...</option>
            {bonus.opciones.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        )}

        <Button
          type="submit"
          size="sm"
          disabled={pending || value === ''}
          aria-busy={pending}
          className="ml-auto"
        >
          {pending ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>
    </form>
  )
}

function jsonToInputValue(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'number') return String(value)
  if (typeof value === 'string') return value
  return ''
}

function BinaryToggle<T extends string>({
  options,
  labels,
  value,
  onChange,
  disabled,
}: {
  options: readonly [T, T]
  labels: Record<T, string>
  value: string
  onChange: (v: T) => void
  disabled: boolean
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-input">
      {options.map((op, i) => (
        <button
          key={op}
          type="button"
          disabled={disabled}
          onClick={() => onChange(op)}
          aria-pressed={value === op}
          className={
            'px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ' +
            (value === op
              ? 'bg-foreground text-background'
              : 'bg-transparent text-foreground hover:bg-accent') +
            (i === 0 ? ' border-r border-input' : '')
          }
        >
          {labels[op]}
        </button>
      ))}
    </div>
  )
}
