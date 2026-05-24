'use client'

import { useActionState, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { actualizarConfiguracion } from '@/lib/actions/configuracion'
import { INITIAL_CONFIGURACION_STATE } from '@/lib/configuracion-logic'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export interface ConfiguracionFormValues {
  puntos_marcador_exacto: number
  puntos_solo_ganador: number
  puntos_campeon: number
  puntos_subcampeon: number
  puntos_goleador: number
  goleador_oficial: string | null
}

interface FormularioConfiguracionProps {
  actual: ConfiguracionFormValues
  locked: boolean
}

export function FormularioConfiguracion({
  actual,
  locked,
}: FormularioConfiguracionProps) {
  const [state, formAction, pending] = useActionState(
    actualizarConfiguracion,
    INITIAL_CONFIGURACION_STATE,
  )

  // Controlled inputs so the page revalidation after save doesn't trip the
  // "default value changed after init" warning from Base UI. We re-sync from
  // props on every successful save so the form shows the canonical value.
  const [marcador, setMarcador] = useState(String(actual.puntos_marcador_exacto))
  const [ganador, setGanador] = useState(String(actual.puntos_solo_ganador))
  const [campeon, setCampeon] = useState(String(actual.puntos_campeon))
  const [subcampeon, setSubcampeon] = useState(String(actual.puntos_subcampeon))
  const [goleadorPts, setGoleadorPts] = useState(String(actual.puntos_goleador))
  const [goleador, setGoleador] = useState(actual.goleador_oficial ?? '')

  useEffect(() => {
    if (state.result?.success) {
      // Refresh local state from the (now-revalidated) props so we don't
      // show stale numbers if the action coerced anything.
      setMarcador(String(actual.puntos_marcador_exacto))
      setGanador(String(actual.puntos_solo_ganador))
      setCampeon(String(actual.puntos_campeon))
      setSubcampeon(String(actual.puntos_subcampeon))
      setGoleadorPts(String(actual.puntos_goleador))
      setGoleador(actual.goleador_oficial ?? '')
    }
  }, [
    state.result,
    actual.puntos_marcador_exacto,
    actual.puntos_solo_ganador,
    actual.puntos_campeon,
    actual.puntos_subcampeon,
    actual.puntos_goleador,
    actual.goleador_oficial,
  ])

  useEffect(() => {
    if (!state.result) return
    if (state.result.success) {
      toast.success('Configuración guardada')
    } else {
      toast.error(state.result.error)
    }
  }, [state.result])

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {locked && (
        <div className="rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          🔒 El Mundial ya arrancó — los puntos quedaron congelados. Solo
          podés editar el goleador oficial.
        </div>
      )}

      <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-display text-lg font-medium text-foreground">
          Sistema de puntos
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <PuntosField
            id="puntos_marcador_exacto"
            label="Marcador exacto"
            value={marcador}
            onChange={setMarcador}
            disabled={locked || pending}
          />
          <PuntosField
            id="puntos_solo_ganador"
            label="Solo ganador"
            value={ganador}
            onChange={setGanador}
            disabled={locked || pending}
          />
          <PuntosField
            id="puntos_campeon"
            label="Campeón del torneo"
            value={campeon}
            onChange={setCampeon}
            disabled={locked || pending}
          />
          <PuntosField
            id="puntos_subcampeon"
            label="Subcampeón"
            value={subcampeon}
            onChange={setSubcampeon}
            disabled={locked || pending}
          />
          <PuntosField
            id="puntos_goleador"
            label="Goleador del torneo"
            value={goleadorPts}
            onChange={setGoleadorPts}
            disabled={locked || pending}
          />
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-display text-lg font-medium text-foreground">
          Goleador oficial
        </h2>
        <p className="text-sm text-muted-foreground">
          Setealo al cerrar el torneo. La comparación con las predicciones
          es insensible a mayúsculas y tildes.
        </p>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="goleador_oficial">Nombre</Label>
          <Input
            id="goleador_oficial"
            name="goleador_oficial"
            type="text"
            maxLength={80}
            value={goleador}
            onChange={(e) => setGoleador(e.target.value)}
            placeholder="Mbappé"
            disabled={pending}
            autoComplete="off"
          />
        </div>
      </section>

      <Button
        type="submit"
        size="lg"
        disabled={pending}
        aria-busy={pending}
        className="w-full"
      >
        {pending ? 'Guardando...' : 'Guardar configuración'}
      </Button>
    </form>
  )
}

function PuntosField({
  id,
  label,
  value,
  onChange,
  disabled,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  disabled: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={id}
        type="number"
        min={0}
        max={100}
        step={1}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="font-mono tabular-nums"
      />
    </div>
  )
}
