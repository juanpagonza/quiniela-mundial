'use client'

import { useActionState, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { crearAjuste, INITIAL_AJUSTE_STATE } from '@/lib/actions/ajustes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { UsuarioMini } from '@/lib/queries/ajustes'

interface FormularioAjusteProps {
  usuarios: UsuarioMini[]
}

export function FormularioAjuste({ usuarios }: FormularioAjusteProps) {
  const [state, formAction, pending] = useActionState(
    crearAjuste,
    INITIAL_AJUSTE_STATE,
  )

  // Local state so we can reset on success.
  const [usuario, setUsuario] = useState('')
  const [puntos, setPuntos] = useState('')
  const [motivo, setMotivo] = useState('')

  useEffect(() => {
    if (!state.result) return
    if (state.result.success) {
      toast.success('Ajuste registrado')
      setUsuario('')
      setPuntos('')
      setMotivo('')
    } else {
      toast.error(state.result.error)
    }
  }, [state.result])

  return (
    <form
      action={formAction}
      className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="usuario_id">Usuario</Label>
        <select
          id="usuario_id"
          name="usuario_id"
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
          required
          disabled={pending}
          className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="">Elegir usuario...</option>
          {usuarios.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="puntos">Puntos (positivo o negativo)</Label>
        <Input
          id="puntos"
          name="puntos"
          type="number"
          inputMode="numeric"
          min={-100}
          max={100}
          required
          value={puntos}
          onChange={(e) => setPuntos(e.target.value)}
          disabled={pending}
          placeholder="5 ó -3"
          className="font-mono tabular-nums"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="motivo">Motivo</Label>
        <textarea
          id="motivo"
          name="motivo"
          required
          rows={3}
          maxLength={280}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          disabled={pending}
          placeholder="Premio sorpresa por participación, error administrativo, etc."
          className="rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <p className="text-right text-[10px] text-muted-foreground">
          {motivo.length} / 280
        </p>
      </div>

      <Button type="submit" disabled={pending} aria-busy={pending}>
        {pending ? 'Registrando...' : 'Registrar ajuste'}
      </Button>
    </form>
  )
}
