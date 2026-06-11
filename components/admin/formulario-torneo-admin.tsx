'use client'

import { useActionState, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { editarPrediccionTorneoAdmin } from '@/lib/actions/admin-torneo'
import { INITIAL_ADMIN_PREDICCION_STATE } from '@/lib/admin-predicciones-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { EquipoMini } from '@/lib/queries/partidos'
import type { PrediccionTorneoAdmin } from '@/lib/queries/admin-torneo'

interface Props {
  usuarioId: string
  usuarioNombre: string
  equipos: EquipoMini[]
  prediccion: PrediccionTorneoAdmin | null
}

/**
 * Admin-only editor for one user's tournament-wide picks (campeón,
 * subcampeón, goleador). Controlled inputs because the parent revalidates
 * after each save — Base UI complains about uncontrolled→controlled flips
 * otherwise.
 *
 * The parent renders us with `key={usuarioId}`, so React remounts the
 * component (and the useState re-initializes from the new prediccion
 * props) whenever the picker changes. React 19 idiom for "reset state
 * when a prop changes" — no setState-in-effect needed.
 *
 * Disable-when-no-changes prevents the admin from triggering a redundant
 * audit log entry / RPC recalc with the same values that are already in
 * the DB. The dirty-check compares trimmed strings to match how the
 * action normalizes the input.
 */
export function FormularioTorneoAdmin({
  usuarioId,
  usuarioNombre,
  equipos,
  prediccion,
}: Props) {
  const [state, formAction, pending] = useActionState(
    editarPrediccionTorneoAdmin,
    INITIAL_ADMIN_PREDICCION_STATE,
  )

  const initialCampeon = prediccion?.campeon_equipo_id ?? ''
  const initialSubcampeon = prediccion?.subcampeon_equipo_id ?? ''
  const initialGoleador = prediccion?.goleador_nombre ?? ''

  const [campeon, setCampeon] = useState<string>(initialCampeon)
  const [subcampeon, setSubcampeon] = useState<string>(initialSubcampeon)
  const [goleador, setGoleador] = useState<string>(initialGoleador)

  useEffect(() => {
    if (!state.result) return
    if (state.result.success) {
      toast.success(state.result.message ?? 'Guardado')
    } else {
      toast.error(state.result.error)
    }
  }, [state.result])

  const conflicto =
    campeon !== '' && subcampeon !== '' && campeon === subcampeon

  // Dirty check: trim the goleador the same way the action does so a
  // pure whitespace change still counts as no-op.
  const dirty =
    campeon !== initialCampeon ||
    subcampeon !== initialSubcampeon ||
    goleador.trim() !== initialGoleador.trim()

  const sinPrediccion = prediccion == null

  const puntosTotales =
    (prediccion?.puntos_campeon ?? 0) +
    (prediccion?.puntos_subcampeon ?? 0) +
    (prediccion?.puntos_goleador ?? 0)

  return (
    <form
      action={formAction}
      className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-6"
    >
      <input type="hidden" name="usuarioId" value={usuarioId} />

      <div className="flex items-start justify-between gap-2">
        <h3 className="font-display text-lg font-medium text-foreground">
          Predicción del Mundial
        </h3>
        <span className="text-xs text-muted-foreground">
          Editando:{' '}
          <span className="font-medium text-foreground">{usuarioNombre}</span>
        </span>
      </div>

      {sinPrediccion && (
        <p className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Este participante todavía no cargó su predicción del torneo. Al
          guardar se crea la fila a su nombre.
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="admin-campeon" className="text-base">
          🏆 Campeón
        </Label>
        <EquipoSelect
          id="admin-campeon"
          name="campeonEquipoId"
          equipos={equipos}
          value={campeon}
          onChange={setCampeon}
          disabled={pending}
          placeholder="Elegí el campeón"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="admin-subcampeon" className="text-base">
          🥈 Subcampeón
        </Label>
        <EquipoSelect
          id="admin-subcampeon"
          name="subcampeonEquipoId"
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
        <Label htmlFor="admin-goleador" className="text-base">
          ⚽ Goleador del torneo
        </Label>
        <Input
          id="admin-goleador"
          name="goleadorNombre"
          type="text"
          maxLength={80}
          value={goleador}
          onChange={(e) => setGoleador(e.target.value)}
          placeholder="Ej: Lionel Messi"
          disabled={pending}
          autoComplete="off"
        />
        <p className="text-xs text-muted-foreground">
          Comparación insensible a mayúsculas y tildes (Mbappé == mbappe).
        </p>
      </div>

      {prediccion && (
        <div className="flex flex-wrap items-center gap-3 border-t border-border/60 pt-3 text-xs text-muted-foreground">
          <span>
            Puntos torneo actuales:{' '}
            <span className="font-mono font-semibold tabular-nums text-foreground">
              {puntosTotales}
            </span>
          </span>
          <span className="text-muted-foreground/40">·</span>
          <span>
            Campeón:{' '}
            <span className="font-mono tabular-nums text-foreground/80">
              {prediccion.puntos_campeon}
            </span>
          </span>
          <span>
            Subcampeón:{' '}
            <span className="font-mono tabular-nums text-foreground/80">
              {prediccion.puntos_subcampeon}
            </span>
          </span>
          <span>
            Goleador:{' '}
            <span className="font-mono tabular-nums text-foreground/80">
              {prediccion.puntos_goleador}
            </span>
          </span>
        </div>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={pending || conflicto || !dirty}
        aria-busy={pending}
        className="w-full"
      >
        {pending
          ? 'Guardando...'
          : !dirty
            ? 'Sin cambios'
            : 'Guardar como admin'}
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
