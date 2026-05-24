'use client'

import { useActionState, useEffect } from 'react'
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
            defaultValue={actual.puntos_marcador_exacto}
            disabled={locked || pending}
          />
          <PuntosField
            id="puntos_solo_ganador"
            label="Solo ganador"
            defaultValue={actual.puntos_solo_ganador}
            disabled={locked || pending}
          />
          <PuntosField
            id="puntos_campeon"
            label="Campeón del torneo"
            defaultValue={actual.puntos_campeon}
            disabled={locked || pending}
          />
          <PuntosField
            id="puntos_subcampeon"
            label="Subcampeón"
            defaultValue={actual.puntos_subcampeon}
            disabled={locked || pending}
          />
          <PuntosField
            id="puntos_goleador"
            label="Goleador del torneo"
            defaultValue={actual.puntos_goleador}
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
            defaultValue={actual.goleador_oficial ?? ''}
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
  defaultValue,
  disabled,
}: {
  id: string
  label: string
  defaultValue: number
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
        defaultValue={defaultValue}
        disabled={disabled}
        className="font-mono tabular-nums"
      />
    </div>
  )
}
