'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { BanderaEquipo } from '@/components/bandera-equipo'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatearKickoff } from '@/lib/dates'
import type { BonusPendiente } from '@/lib/queries/preguntas-bonus'

const STORAGE_KEY = 'recordatorio_bonus_visto'

interface RecordatorioBonusModalProps {
  bonusPendientes: BonusPendiente[]
}

export function RecordatorioBonusModal({
  bonusPendientes,
}: RecordatorioBonusModalProps) {
  const [open, setOpen] = useState(false)

  // Auto-open on mount if the user hasn't dismissed it this session.
  // sessionStorage lives on window so we check on the client after hydration.
  useEffect(() => {
    if (bonusPendientes.length === 0) return
    if (typeof window === 'undefined') return
    try {
      if (window.sessionStorage.getItem(STORAGE_KEY) !== '1') {
        setOpen(true)
      }
    } catch {
      // Some browsers (e.g. private mode quotas) throw on sessionStorage access.
      // Better to skip the reminder than to crash the home page.
    }
  }, [bonusPendientes.length])

  const dismiss = () => {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, '1')
    } catch {
      // ignore — see note above
    }
    setOpen(false)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) dismiss()
    else setOpen(true)
  }

  if (bonusPendientes.length === 0) return null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-medium tracking-tight">
            Te faltan preguntas bonus
          </DialogTitle>
          <DialogDescription>
            Estas preguntas están abiertas y todavía no respondiste:
          </DialogDescription>
        </DialogHeader>

        <ul className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto">
          {bonusPendientes.map((b) => (
            <li key={b.pregunta_bonus_id}>
              <Link
                href={`/partidos/${b.partido_id}`}
                onClick={dismiss}
                className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-3 transition-all hover:border-foreground/30 hover:shadow-sm focus-visible:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <BanderaEquipo
                      codigoPais={b.equipo_local_codigo_pais}
                      nombre={b.equipo_local_nombre}
                      size="sm"
                      showName={false}
                    />
                    <span className="truncate text-sm font-medium text-foreground">
                      {b.equipo_local_nombre}
                    </span>
                    <span className="text-xs text-muted-foreground">vs</span>
                    <BanderaEquipo
                      codigoPais={b.equipo_visitante_codigo_pais}
                      nombre={b.equipo_visitante_nombre}
                      size="sm"
                      showName={false}
                    />
                    <span className="truncate text-sm font-medium text-foreground">
                      {b.equipo_visitante_nombre}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  {formatearKickoff(b.fecha_hora_kickoff)}
                </p>
                <p className="text-sm leading-snug text-foreground">
                  {b.enunciado}
                </p>
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-3 border-t border-border/60 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Podés volver al inicio cuando quieras.
          </p>
          <Button type="button" variant="outline" onClick={dismiss}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
