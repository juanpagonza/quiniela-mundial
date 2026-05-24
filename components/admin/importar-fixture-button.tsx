'use client'

import { useActionState, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { importarFixtureAction } from '@/lib/actions/admin-partidos'
import { INITIAL_ADMIN_PARTIDO_STATE } from '@/lib/admin-partidos-state'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { DownloadIcon } from 'lucide-react'

export function ImportarFixtureButton() {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(
    importarFixtureAction,
    INITIAL_ADMIN_PARTIDO_STATE,
  )

  useEffect(() => {
    if (!state.result) return
    if (state.result.success) {
      toast.success(state.result.message ?? 'Fixture importado')
      setOpen(false)
    } else {
      toast.error(state.result.error)
    }
  }, [state.result])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" className="gap-1.5">
            <DownloadIcon className="size-4" />
            Importar fixture
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Importar fixture</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Esto pega a football-data.org y crea/actualiza los equipos y
          partidos del Mundial. Es idempotente: re-ejecutar solo refresca
          los datos sin duplicar nada. Los marcadores reales y el toggle
          de visibilidad no se tocan.
        </p>

        <form action={formAction} className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={pending} aria-busy={pending}>
            {pending ? 'Importando...' : 'Importar'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
