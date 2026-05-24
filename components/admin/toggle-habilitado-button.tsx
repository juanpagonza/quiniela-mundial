'use client'

import { useActionState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  toggleHabilitadoPartido,
  INITIAL_ADMIN_PARTIDO_STATE,
} from '@/lib/actions/admin-partidos'
import { Button } from '@/components/ui/button'
import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ToggleHabilitadoButton({
  partidoId,
  habilitado,
}: {
  partidoId: string
  habilitado: boolean
}) {
  const [state, formAction, pending] = useActionState(
    toggleHabilitadoPartido,
    INITIAL_ADMIN_PARTIDO_STATE,
  )

  useEffect(() => {
    if (!state.result) return
    if (state.result.success) toast.success(state.result.message ?? 'OK')
    else toast.error(state.result.error)
  }, [state.result])

  return (
    <form action={formAction}>
      <input type="hidden" name="partidoId" value={partidoId} />
      <input type="hidden" name="habilitado" value={(!habilitado).toString()} />
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        disabled={pending}
        aria-busy={pending}
        title={habilitado ? 'Ocultar partido' : 'Hacer visible'}
        className={cn(
          'gap-1.5',
          habilitado ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        {habilitado ? (
          <>
            <EyeIcon className="size-4" />
            Visible
          </>
        ) : (
          <>
            <EyeOffIcon className="size-4" />
            Oculto
          </>
        )}
      </Button>
    </form>
  )
}
