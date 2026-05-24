'use client'

import { useActionState, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  crearPreguntaBonus,
  editarPreguntaBonus,
} from '@/lib/actions/preguntas-bonus'
import { INITIAL_ADMIN_BONUS_STATE } from '@/lib/preguntas-bonus-logic'
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
import { PlusIcon, PencilIcon } from 'lucide-react'
import type { TipoPreguntaBonus } from '@/lib/supabase/types'
import type { PreguntaBonusAdmin } from '@/lib/queries/admin-partido'

interface FormularioBonusDialogProps {
  partidoId: string
  pregunta?: PreguntaBonusAdmin | null
}

const TIPO_LABELS: Record<TipoPreguntaBonus, string> = {
  numero: 'Número',
  over_under: 'Más / Menos',
  si_no: 'Sí / No',
  opcion_multiple: 'Opción múltiple',
}

export function FormularioBonusDialog({
  partidoId,
  pregunta,
}: FormularioBonusDialogProps) {
  const isEdit = Boolean(pregunta)
  const [open, setOpen] = useState(false)
  const action = isEdit ? editarPreguntaBonus : crearPreguntaBonus

  const [state, formAction, pending] = useActionState(
    action,
    INITIAL_ADMIN_BONUS_STATE,
  )

  // Local state for every field so they're controlled — avoids Base UI's
  // "default value changed after init" warning when the parent revalidates.
  // Re-sync from props every time the dialog opens.
  const [tipo, setTipo] = useState<TipoPreguntaBonus>(
    pregunta?.tipo ?? 'si_no',
  )
  const [enunciado, setEnunciado] = useState<string>(pregunta?.enunciado ?? '')
  const [opciones, setOpciones] = useState<string>(
    (pregunta?.opciones ?? []).join('\n'),
  )
  const [puntos, setPuntos] = useState<string>(String(pregunta?.puntos ?? 2))

  useEffect(() => {
    if (open) {
      setTipo(pregunta?.tipo ?? 'si_no')
      setEnunciado(pregunta?.enunciado ?? '')
      setOpciones((pregunta?.opciones ?? []).join('\n'))
      setPuntos(String(pregunta?.puntos ?? 2))
    }
  }, [open, pregunta])

  useEffect(() => {
    if (!state.result) return
    if (state.result.success) {
      toast.success(isEdit ? 'Pregunta actualizada' : 'Pregunta creada')
      setOpen(false)
    } else {
      toast.error(state.result.error)
    }
  }, [state.result, isEdit])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          isEdit ? (
            <Button variant="ghost" size="icon-sm" aria-label="Editar pregunta">
              <PencilIcon className="size-4" />
            </Button>
          ) : (
            <Button>
              <PlusIcon className="size-4" />
              Agregar pregunta
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Editar pregunta bonus' : 'Nueva pregunta bonus'}
          </DialogTitle>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="partidoId" value={partidoId} />
          {isEdit && pregunta && (
            <input type="hidden" name="preguntaId" value={pregunta.id} />
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tipo">Tipo</Label>
            <select
              id="tipo"
              name="tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoPreguntaBonus)}
              disabled={pending}
              className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {(Object.keys(TIPO_LABELS) as TipoPreguntaBonus[]).map((t) => (
                <option key={t} value={t}>
                  {TIPO_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="enunciado">Enunciado</Label>
            <textarea
              id="enunciado"
              name="enunciado"
              value={enunciado}
              onChange={(e) => setEnunciado(e.target.value)}
              required
              rows={2}
              maxLength={280}
              disabled={pending}
              className="rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              placeholder="¿Cuántos goles habrá en total?"
            />
          </div>

          {tipo === 'opcion_multiple' && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="opciones">Opciones (una por línea)</Label>
              <textarea
                id="opciones"
                name="opciones"
                value={opciones}
                onChange={(e) => setOpciones(e.target.value)}
                rows={4}
                disabled={pending}
                className="rounded-lg border border-input bg-transparent px-3 py-2 font-mono text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                placeholder={'Messi\nVinicius\nMbappé\nOtro'}
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="puntos">Puntos</Label>
            <Input
              id="puntos"
              name="puntos"
              type="number"
              min={1}
              max={20}
              value={puntos}
              onChange={(e) => setPuntos(e.target.value)}
              required
              disabled={pending}
              className="w-24"
            />
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
              {pending
                ? 'Guardando...'
                : isEdit
                  ? 'Actualizar'
                  : 'Crear pregunta'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
