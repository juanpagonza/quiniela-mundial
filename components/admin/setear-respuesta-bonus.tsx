'use client'

import { useActionState, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  setearRespuestaCorrecta,
  INITIAL_ADMIN_BONUS_STATE,
} from '@/lib/actions/preguntas-bonus'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Json, TipoPreguntaBonus } from '@/lib/supabase/types'

interface SetearRespuestaBonusProps {
  preguntaId: string
  partidoId: string
  tipo: TipoPreguntaBonus
  opciones: string[] | null
  respuestaActual: Json | null
}

export function SetearRespuestaBonus({
  preguntaId,
  partidoId,
  tipo,
  opciones,
  respuestaActual,
}: SetearRespuestaBonusProps) {
  const [state, formAction, pending] = useActionState(
    setearRespuestaCorrecta,
    INITIAL_ADMIN_BONUS_STATE,
  )

  const initialValue =
    respuestaActual == null
      ? ''
      : typeof respuestaActual === 'number'
        ? String(respuestaActual)
        : typeof respuestaActual === 'string'
          ? respuestaActual
          : ''
  const [value, setValue] = useState(initialValue)

  useEffect(() => {
    if (!state.result) return
    if (state.result.success) {
      toast.success('Respuesta correcta guardada — puntos recalculados')
    } else {
      toast.error(state.result.error)
    }
  }, [state.result])

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="preguntaId" value={preguntaId} />
      <input type="hidden" name="partidoId" value={partidoId} />
      <input type="hidden" name="tipo" value={tipo} />
      {opciones && (
        <input
          type="hidden"
          name="opciones"
          value={JSON.stringify(opciones)}
        />
      )}
      <input type="hidden" name="respuesta" value={value} />

      <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        Respuesta correcta
      </span>

      {tipo === 'numero' && (
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          max={99}
          required
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={pending}
          className="h-9 w-20 text-center font-mono tabular-nums"
        />
      )}

      {tipo === 'over_under' && (
        <BinaryToggle
          options={['over', 'under']}
          labels={{ over: 'Más', under: 'Menos' }}
          value={value}
          onChange={setValue}
          disabled={pending}
        />
      )}

      {tipo === 'si_no' && (
        <BinaryToggle
          options={['si', 'no']}
          labels={{ si: 'Sí', no: 'No' }}
          value={value}
          onChange={setValue}
          disabled={pending}
        />
      )}

      {tipo === 'opcion_multiple' && opciones && (
        <select
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={pending}
          className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="">Elegir...</option>
          {opciones.map((o) => (
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
      >
        {pending ? 'Guardando...' : 'Guardar'}
      </Button>
    </form>
  )
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
