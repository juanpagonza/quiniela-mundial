'use client'

import { useActionState, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { upsertPrediccionBonus } from '@/lib/actions/predicciones-bonus'
import {
  INITIAL_BONUS_STATE,
  type BonusActionState,
} from '@/lib/predicciones-bonus-logic'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { Json } from '@/lib/supabase/types'
import type { PreguntaBonusConMiRespuesta } from '@/lib/queries/preguntas-bonus'

interface PreguntasBonusProps {
  partidoId: string
  preguntas: PreguntaBonusConMiRespuesta[]
}

export function PreguntasBonus({ partidoId, preguntas }: PreguntasBonusProps) {
  if (preguntas.length === 0) return null

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-display text-xl font-medium text-foreground">
          Preguntas bonus
        </h2>
        <span className="text-xs text-muted-foreground">
          {preguntas.length === 1 ? '1 pregunta' : `${preguntas.length} preguntas`}
        </span>
      </div>
      <ul className="flex flex-col gap-3">
        {preguntas.map((p) => (
          <li key={p.id}>
            <PreguntaBonusItem partidoId={partidoId} pregunta={p} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function PreguntaBonusItem({
  partidoId,
  pregunta,
}: {
  partidoId: string
  pregunta: PreguntaBonusConMiRespuesta
}) {
  const [state, formAction, pending] = useActionState<BonusActionState, FormData>(
    upsertPrediccionBonus,
    INITIAL_BONUS_STATE,
  )

  useEffect(() => {
    if (!state.result) return
    if (state.result.success) {
      toast.success('Respuesta guardada')
    } else {
      toast.error(state.result.error)
    }
  }, [state.result])

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5"
    >
      <input type="hidden" name="partidoId" value={partidoId} />
      <input type="hidden" name="preguntaBonusId" value={pregunta.id} />
      <input type="hidden" name="tipo" value={pregunta.tipo} />
      {pregunta.opciones && (
        <input
          type="hidden"
          name="opciones"
          value={JSON.stringify(pregunta.opciones)}
        />
      )}

      <div className="flex items-start justify-between gap-3">
        <p className="text-sm leading-relaxed text-foreground">
          {pregunta.enunciado}
        </p>
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          +{pregunta.puntos}
        </span>
      </div>

      <PreguntaInput
        tipo={pregunta.tipo}
        opciones={pregunta.opciones}
        miRespuesta={pregunta.mi_respuesta}
        pending={pending}
      />
    </form>
  )
}

interface PreguntaInputProps {
  tipo: PreguntaBonusConMiRespuesta['tipo']
  opciones: string[] | null
  miRespuesta: Json | null
  pending: boolean
}

function PreguntaInput({ tipo, opciones, miRespuesta, pending }: PreguntaInputProps) {
  switch (tipo) {
    case 'numero':
      return <NumeroInput miRespuesta={miRespuesta} pending={pending} />
    case 'over_under':
      return (
        <ToggleParInput
          opciones={['over', 'under']}
          labels={{ over: 'Más', under: 'Menos' }}
          miRespuesta={miRespuesta}
          pending={pending}
        />
      )
    case 'si_no':
      return (
        <ToggleParInput
          opciones={['si', 'no']}
          labels={{ si: 'Sí', no: 'No' }}
          miRespuesta={miRespuesta}
          pending={pending}
        />
      )
    case 'opcion_multiple':
      return (
        <OpcionMultipleInput
          opciones={opciones ?? []}
          miRespuesta={miRespuesta}
          pending={pending}
        />
      )
    default:
      return null
  }
}

function NumeroInput({
  miRespuesta,
  pending,
}: {
  miRespuesta: Json | null
  pending: boolean
}) {
  const initial =
    typeof miRespuesta === 'number' ? String(miRespuesta) : ''
  const [value, setValue] = useState(initial)

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        inputMode="numeric"
        pattern="[0-9]*"
        min={0}
        max={99}
        required
        name="respuesta"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={pending}
        className="h-12 max-w-[7rem] text-center font-mono text-2xl font-semibold tabular-nums"
        autoComplete="off"
      />
      <Button
        type="submit"
        disabled={pending || value === ''}
        aria-busy={pending}
      >
        {pending ? 'Guardando...' : miRespuesta != null ? 'Actualizar' : 'Guardar'}
      </Button>
    </div>
  )
}

function ToggleParInput<T extends string>({
  opciones,
  labels,
  miRespuesta,
  pending,
}: {
  opciones: readonly [T, T]
  labels: Record<T, string>
  miRespuesta: Json | null
  pending: boolean
}) {
  const initial = (typeof miRespuesta === 'string' ? miRespuesta : '') as T | ''
  const [value, setValue] = useState<T | ''>(initial)

  return (
    <>
      <input type="hidden" name="respuesta" value={value} />
      <div className="grid grid-cols-2 gap-2">
        {opciones.map((op) => (
          <ToggleButton
            key={op}
            selected={value === op}
            disabled={pending}
            onClick={(e) => {
              setValue(op)
              const form = e.currentTarget.form
              // Defer the submit so the hidden input picks up the new value.
              if (form) queueMicrotask(() => form.requestSubmit())
            }}
          >
            {labels[op]}
          </ToggleButton>
        ))}
      </div>
    </>
  )
}

function OpcionMultipleInput({
  opciones,
  miRespuesta,
  pending,
}: {
  opciones: string[]
  miRespuesta: Json | null
  pending: boolean
}) {
  const initial = typeof miRespuesta === 'string' ? miRespuesta : ''
  const [value, setValue] = useState<string>(initial)

  return (
    <>
      <input type="hidden" name="respuesta" value={value} />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {opciones.map((op) => (
          <ToggleButton
            key={op}
            selected={value === op}
            disabled={pending}
            onClick={(e) => {
              setValue(op)
              const form = e.currentTarget.form
              if (form) queueMicrotask(() => form.requestSubmit())
            }}
          >
            {op}
          </ToggleButton>
        ))}
      </div>
    </>
  )
}

function ToggleButton({
  selected,
  disabled,
  onClick,
  children,
}: {
  selected: boolean
  disabled: boolean
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        'rounded-xl border px-4 py-3 text-sm font-medium transition-all',
        selected
          ? 'border-foreground bg-foreground text-background'
          : 'border-border bg-card text-foreground hover:border-foreground/40 hover:bg-accent',
        disabled && 'opacity-50',
      )}
    >
      {children}
    </button>
  )
}

