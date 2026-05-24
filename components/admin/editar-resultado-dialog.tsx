'use client'

import { useActionState, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { editarResultadoPartido } from '@/lib/actions/admin-partidos'
import { INITIAL_ADMIN_PARTIDO_STATE } from '@/lib/admin-partidos-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { PencilIcon } from 'lucide-react'
import type { EstadoPartido } from '@/lib/supabase/types'

interface EditarResultadoDialogProps {
  partidoId: string
  marcadorLocal: number | null
  marcadorVisitante: number | null
  estado: EstadoPartido
  nombreLocal: string
  nombreVisitante: string
}

const ESTADO_LABELS: Record<EstadoPartido, string> = {
  programado: 'Programado',
  en_curso: 'En curso',
  finalizado: 'Finalizado',
  suspendido: 'Suspendido',
}

export function EditarResultadoDialog({
  partidoId,
  marcadorLocal,
  marcadorVisitante,
  estado,
  nombreLocal,
  nombreVisitante,
}: EditarResultadoDialogProps) {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(
    editarResultadoPartido,
    INITIAL_ADMIN_PARTIDO_STATE,
  )

  // Controlled inputs so prop updates after revalidation don't trip Base UI's
  // "default value changed after init" warning. Re-sync when the dialog opens
  // so the form picks up fresh data.
  const [localInput, setLocalInput] = useState(
    marcadorLocal != null ? String(marcadorLocal) : '',
  )
  const [visitInput, setVisitInput] = useState(
    marcadorVisitante != null ? String(marcadorVisitante) : '',
  )
  const [estadoInput, setEstadoInput] = useState<EstadoPartido>(estado)

  useEffect(() => {
    if (open) {
      setLocalInput(marcadorLocal != null ? String(marcadorLocal) : '')
      setVisitInput(marcadorVisitante != null ? String(marcadorVisitante) : '')
      setEstadoInput(estado)
    }
  }, [open, marcadorLocal, marcadorVisitante, estado])

  useEffect(() => {
    if (!state.result) return
    if (state.result.success) {
      toast.success(state.result.message ?? 'OK')
      setOpen(false)
    } else {
      toast.error(state.result.error)
    }
  }, [state.result])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="sm" className="gap-1.5">
            <PencilIcon className="size-4" />
            Resultado
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar resultado</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Cambiar el marcador real dispara el recálculo de puntos para todas
          las predicciones de este partido.
        </p>

        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="partidoId" value={partidoId} />

          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="marcador_local_real"
                className="text-center text-xs text-muted-foreground"
              >
                {nombreLocal}
              </Label>
              <Input
                id="marcador_local_real"
                name="marcador_local_real"
                type="number"
                inputMode="numeric"
                min={0}
                max={50}
                value={localInput}
                onChange={(e) => setLocalInput(e.target.value)}
                disabled={pending}
                className="h-14 text-center font-mono text-2xl font-semibold tabular-nums"
                placeholder="—"
              />
            </div>
            <span
              aria-hidden="true"
              className="pb-3 text-xl font-light text-muted-foreground"
            >
              –
            </span>
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="marcador_visitante_real"
                className="text-center text-xs text-muted-foreground"
              >
                {nombreVisitante}
              </Label>
              <Input
                id="marcador_visitante_real"
                name="marcador_visitante_real"
                type="number"
                inputMode="numeric"
                min={0}
                max={50}
                value={visitInput}
                onChange={(e) => setVisitInput(e.target.value)}
                disabled={pending}
                className="h-14 text-center font-mono text-2xl font-semibold tabular-nums"
                placeholder="—"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="estado">Estado</Label>
            <select
              id="estado"
              name="estado"
              value={estadoInput}
              onChange={(e) => setEstadoInput(e.target.value as EstadoPartido)}
              disabled={pending}
              className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {(Object.keys(ESTADO_LABELS) as EstadoPartido[]).map((e) => (
                <option key={e} value={e}>
                  {ESTADO_LABELS[e]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending} aria-busy={pending}>
              {pending ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
