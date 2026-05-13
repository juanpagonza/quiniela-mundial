'use client'

import { useActionState, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  upsertPrediccionPartido,
  INITIAL_PREDICCION_STATE,
} from '@/lib/actions/predicciones'
import { MARCADOR_MAX, MARCADOR_MIN } from '@/lib/predicciones-logic'
import { estaBloqueado, tiempoHastaKickoff } from '@/lib/dates'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BanderaEquipo } from '@/components/bandera-equipo'

interface FormularioPrediccionProps {
  partidoId: string
  fechaHoraKickoff: string
  equipoLocal: { codigo_pais: string; nombre: string }
  equipoVisitante: { codigo_pais: string; nombre: string }
  habilitadoParaPredecir: boolean
  prediccionExistente: {
    marcador_local: number
    marcador_visitante: number
  } | null
}

export function FormularioPrediccion({
  partidoId,
  fechaHoraKickoff,
  equipoLocal,
  equipoVisitante,
  habilitadoParaPredecir,
  prediccionExistente,
}: FormularioPrediccionProps) {
  // Live "ahora" tick so the lock kicks in even if the user keeps the page open.
  const [ahora, setAhora] = useState<Date>(() => new Date())
  useEffect(() => {
    const interval = setInterval(() => setAhora(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const bloqueado = estaBloqueado(fechaHoraKickoff, ahora)
  const countdown = tiempoHastaKickoff(fechaHoraKickoff, ahora)

  const [local, setLocal] = useState<string>(
    prediccionExistente ? String(prediccionExistente.marcador_local) : '',
  )
  const [visitante, setVisitante] = useState<string>(
    prediccionExistente ? String(prediccionExistente.marcador_visitante) : '',
  )

  const [state, formAction, pending] = useActionState(
    upsertPrediccionPartido,
    INITIAL_PREDICCION_STATE,
  )

  // Toast on result. We key the effect on the result reference so consecutive
  // submits each show a toast (rather than just once).
  useEffect(() => {
    if (!state.result) return
    if (state.result.success) {
      toast.success('Predicción guardada')
    } else {
      toast.error(state.result.error)
    }
  }, [state.result])

  if (!habilitadoParaPredecir) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/40 px-6 py-8 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Aún no disponible
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          El admin todavía no abrió las predicciones para este partido.
        </p>
      </div>
    )
  }

  if (bloqueado) {
    return (
      <div className="rounded-2xl border border-border bg-card px-6 py-8 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Predicciones cerradas
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {countdown}
        </p>
        {prediccionExistente && (
          <p className="mt-4 font-mono text-2xl font-semibold tabular-nums text-foreground">
            Tu predicción: {prediccionExistente.marcador_local} –{' '}
            {prediccionExistente.marcador_visitante}
          </p>
        )}
        {!prediccionExistente && (
          <p className="mt-4 text-sm italic text-muted-foreground">
            No predijiste este partido.
          </p>
        )}
      </div>
    )
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5"
    >
      <input type="hidden" name="partidoId" value={partidoId} />

      <div className="text-center">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Faltan
        </p>
        <p className="font-display text-xl text-foreground">{countdown}</p>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
        <div className="flex flex-col items-center gap-2">
          <BanderaEquipo
            codigoPais={equipoLocal.codigo_pais}
            nombre={equipoLocal.nombre}
            size="md"
            showName={false}
          />
          <Label
            htmlFor="marcadorLocal"
            className="text-center text-xs font-medium text-muted-foreground"
          >
            {equipoLocal.nombre}
          </Label>
          <Input
            id="marcadorLocal"
            name="marcadorLocal"
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            min={MARCADOR_MIN}
            max={MARCADOR_MAX}
            required
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            className="h-16 w-full text-center font-mono text-3xl font-semibold tabular-nums"
            disabled={pending}
            autoComplete="off"
          />
        </div>

        <span
          aria-hidden="true"
          className="pb-4 text-2xl font-light text-muted-foreground/60"
        >
          –
        </span>

        <div className="flex flex-col items-center gap-2">
          <BanderaEquipo
            codigoPais={equipoVisitante.codigo_pais}
            nombre={equipoVisitante.nombre}
            size="md"
            showName={false}
          />
          <Label
            htmlFor="marcadorVisitante"
            className="text-center text-xs font-medium text-muted-foreground"
          >
            {equipoVisitante.nombre}
          </Label>
          <Input
            id="marcadorVisitante"
            name="marcadorVisitante"
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            min={MARCADOR_MIN}
            max={MARCADOR_MAX}
            required
            value={visitante}
            onChange={(e) => setVisitante(e.target.value)}
            className="h-16 w-full text-center font-mono text-3xl font-semibold tabular-nums"
            disabled={pending}
            autoComplete="off"
          />
        </div>
      </div>

      <Button
        type="submit"
        size="lg"
        disabled={pending || local === '' || visitante === ''}
        aria-busy={pending}
        className="w-full"
      >
        {pending
          ? 'Guardando...'
          : prediccionExistente
            ? 'Actualizar predicción'
            : 'Guardar predicción'}
      </Button>
    </form>
  )
}
