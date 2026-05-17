'use client'

import { useActionState, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { upsertPrediccionTorneo } from '@/lib/actions/torneo'
import { INITIAL_TORNEO_STATE } from '@/lib/torneo-logic'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { EquipoMini } from '@/lib/queries/partidos'
import type { MiTorneo } from '@/lib/queries/torneo'

interface FormularioTorneoProps {
  equipos: EquipoMini[]
  miTorneo: MiTorneo | null
}

export function FormularioTorneo({ equipos, miTorneo }: FormularioTorneoProps) {
  const [state, formAction, pending] = useActionState(
    upsertPrediccionTorneo,
    INITIAL_TORNEO_STATE,
  )

  const [campeon, setCampeon] = useState<string>(
    miTorneo?.campeon_equipo_id ?? '',
  )
  const [subcampeon, setSubcampeon] = useState<string>(
    miTorneo?.subcampeon_equipo_id ?? '',
  )
  const [goleador, setGoleador] = useState<string>(
    miTorneo?.goleador_nombre ?? '',
  )

  useEffect(() => {
    if (!state.result) return
    if (state.result.success) {
      toast.success('Predicción del Mundial guardada')
    } else {
      toast.error(state.result.error)
    }
  }, [state.result])

  // Inline validation: same team for camp + subcamp.
  const conflicto =
    campeon !== '' && subcampeon !== '' && campeon === subcampeon

  return (
    <form
      action={formAction}
      className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-6"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="campeon_equipo_id" className="text-base">
          🏆 Campeón
        </Label>
        <EquipoSelect
          id="campeon_equipo_id"
          name="campeon_equipo_id"
          equipos={equipos}
          value={campeon}
          onChange={setCampeon}
          disabled={pending}
          placeholder="Elegí el campeón"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="subcampeon_equipo_id" className="text-base">
          🥈 Subcampeón
        </Label>
        <EquipoSelect
          id="subcampeon_equipo_id"
          name="subcampeon_equipo_id"
          equipos={equipos}
          value={subcampeon}
          onChange={setSubcampeon}
          disabled={pending}
          placeholder="Elegí el subcampeón"
        />
        {conflicto && (
          <p className="text-xs text-destructive">
            Tiene que ser distinto al campeón.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="goleador_nombre" className="text-base">
          ⚽ Goleador del torneo
        </Label>
        <Input
          id="goleador_nombre"
          name="goleador_nombre"
          type="text"
          maxLength={80}
          value={goleador}
          onChange={(e) => setGoleador(e.target.value)}
          placeholder="Mbappé"
          disabled={pending}
          autoComplete="off"
        />
        <p className="text-xs text-muted-foreground">
          Comparación insensible a mayúsculas y tildes (Mbappé == mbappe).
        </p>
      </div>

      <Button
        type="submit"
        size="lg"
        disabled={pending || conflicto}
        aria-busy={pending}
        className="w-full"
      >
        {pending
          ? 'Guardando...'
          : miTorneo
            ? 'Actualizar predicción'
            : 'Guardar predicción'}
      </Button>
    </form>
  )
}

function EquipoSelect({
  id,
  name,
  equipos,
  value,
  onChange,
  disabled,
  placeholder,
}: {
  id: string
  name: string
  equipos: EquipoMini[]
  value: string
  onChange: (v: string) => void
  disabled: boolean
  placeholder: string
}) {
  return (
    <select
      id={id}
      name={name}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="h-11 rounded-lg border border-input bg-transparent px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <option value="">{placeholder}</option>
      {equipos.map((eq) => (
        <option key={eq.id} value={eq.id}>
          {eq.nombre}
        </option>
      ))}
    </select>
  )
}
