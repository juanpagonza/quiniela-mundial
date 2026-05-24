'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import { Label } from '@/components/ui/label'
import type {
  PartidoPickerItem,
  UsuarioPickerItem,
} from '@/lib/queries/admin-predicciones'

interface Props {
  usuarios: UsuarioPickerItem[]
  partidos: PartidoPickerItem[]
  usuarioSeleccionado: string | null
  partidoSeleccionado: string | null
}

/**
 * Two selects that drive `/admin/predicciones?usuario=X&partido=Y`. We
 * round-trip through the URL (instead of holding local state) so the
 * server-side `obtenerPrediccionAdmin` query fires for the chosen pair
 * and the result is bookmarkable / shareable with another admin.
 *
 * useTransition keeps the page interactive while the server fetches the
 * predicción for the new pair — without it the select feels frozen.
 */
export function PrediccionesPickers({
  usuarios,
  partidos,
  usuarioSeleccionado,
  partidoSeleccionado,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()

  function navegar(next: { usuario?: string | null; partido?: string | null }) {
    const params = new URLSearchParams(searchParams.toString())
    const usuario = next.usuario !== undefined ? next.usuario : usuarioSeleccionado
    const partido = next.partido !== undefined ? next.partido : partidoSeleccionado
    if (usuario) params.set('usuario', usuario)
    else params.delete('usuario')
    if (partido) params.set('partido', partido)
    else params.delete('partido')
    const qs = params.toString()
    startTransition(() => {
      router.push(qs ? `/admin/predicciones?${qs}` : '/admin/predicciones')
    })
  }

  return (
    <div className="grid grid-cols-1 gap-4 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="picker-usuario">Participante</Label>
        <select
          id="picker-usuario"
          value={usuarioSeleccionado ?? ''}
          onChange={(e) => navegar({ usuario: e.target.value || null })}
          disabled={pending}
          className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="">Elegir participante...</option>
          {usuarios.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="picker-partido">Partido</Label>
        <select
          id="picker-partido"
          value={partidoSeleccionado ?? ''}
          onChange={(e) => navegar({ partido: e.target.value || null })}
          disabled={pending}
          className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="">Elegir partido...</option>
          {partidos.map((p) => (
            <option key={p.id} value={p.id}>
              {labelPartido(p)}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

function labelPartido(p: PartidoPickerItem): string {
  const fecha = new Date(p.fecha_hora_kickoff).toLocaleDateString('es', {
    day: '2-digit',
    month: 'short',
  })
  const estado = p.estado === 'finalizado' ? ' [Final]' : ''
  return `${fecha} · ${p.equipo_local_nombre} vs ${p.equipo_visitante_nombre}${estado}`
}
