'use client'

import { useActionState, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  eliminarPreguntaBonus,
  INITIAL_ADMIN_BONUS_STATE,
} from '@/lib/actions/preguntas-bonus'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { TrashIcon } from 'lucide-react'

interface EliminarPreguntaBonusProps {
  preguntaId: string
  partidoId: string
  enunciado: string
}

export function EliminarPreguntaBonus({
  preguntaId,
  partidoId,
  enunciado,
}: EliminarPreguntaBonusProps) {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(
    eliminarPreguntaBonus,
    INITIAL_ADMIN_BONUS_STATE,
  )

  useEffect(() => {
    if (!state.result) return
    if (state.result.success) {
      toast.success('Pregunta eliminada')
      setOpen(false)
    } else {
      toast.error(state.result.error)
    }
  }, [state.result])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Eliminar pregunta"
            className="text-muted-foreground hover:text-destructive"
          >
            <TrashIcon className="size-4" />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar pregunta</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Vas a eliminar la pregunta:
        </p>
        <p className="rounded-lg bg-muted px-3 py-2 text-sm italic text-foreground">
          “{enunciado}”
        </p>
        <p className="text-sm text-muted-foreground">
          Todas las predicciones sobre esta pregunta también se borran. No
          se puede deshacer.
        </p>

        <form action={formAction} className="flex justify-end gap-2 pt-2">
          <input type="hidden" name="preguntaId" value={preguntaId} />
          <input type="hidden" name="partidoId" value={partidoId} />
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="destructive"
            disabled={pending}
            aria-busy={pending}
          >
            {pending ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
