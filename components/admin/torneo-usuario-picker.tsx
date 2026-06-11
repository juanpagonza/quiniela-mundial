'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import { Label } from '@/components/ui/label'
import type { UsuarioConTorneo } from '@/lib/queries/admin-torneo'

interface Props {
  usuarios: UsuarioConTorneo[]
  usuarioSeleccionado: string | null
}

/**
 * Select that drives `/admin/torneo?usuario=X`. Round-trips through the
 * URL (instead of holding local state) so the server-side
 * obtenerTorneoUsuarioAdmin query fires for the chosen user and the
 * result is bookmarkable / shareable with another admin.
 *
 * useTransition keeps the page interactive while the server fetches the
 * predicción for the new pair — without it the select feels frozen.
 *
 * Users without a tournament-prediction row yet are suffixed with " (sin
 * cargar)" so the admin sees up-front that they'll be creating the row.
 */
export function TorneoUsuarioPicker({ usuarios, usuarioSeleccionado }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()

  function navegar(next: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (next) params.set('usuario', next)
    else params.delete('usuario')
    const qs = params.toString()
    startTransition(() => {
      router.push(qs ? `/admin/torneo?${qs}` : '/admin/torneo')
    })
  }

  return (
    <div className="grid grid-cols-1 gap-4 rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="picker-usuario-torneo">Participante</Label>
        <select
          id="picker-usuario-torneo"
          value={usuarioSeleccionado ?? ''}
          onChange={(e) => navegar(e.target.value || null)}
          disabled={pending}
          className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="">Elegir participante...</option>
          {usuarios.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nombre}
              {u.tiene_prediccion ? '' : ' (sin cargar)'}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
