'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface BanderaEquipoProps {
  /** ISO-2 lowercase code (e.g. 'ar', 'br', 'gb-eng'). Source: equipos.codigo_pais. */
  codigoPais: string
  /** Display name shown next to the flag and used as alt text when the flag is hidden. */
  nombre: string
  /** Visual variant. Defaults to md (used in match cards). */
  size?: 'sm' | 'md' | 'lg'
  /** Set false to render the flag without the name (e.g. in compact tables). */
  showName?: boolean
  className?: string
}

// flagcdn serves at fixed widths. We render at half the source width to get a
// 2x crisp image on retina displays. Aspect ratio is roughly 4:3 across flags.
const sizes = {
  sm: { displayW: 16, displayH: 12, srcW: 40, textClass: 'text-xs' },
  md: { displayW: 24, displayH: 18, srcW: 80, textClass: 'text-sm' },
  lg: { displayW: 40, displayH: 30, srcW: 80, textClass: 'text-base' },
} as const

export function BanderaEquipo({
  codigoPais,
  nombre,
  size = 'md',
  showName = true,
  className,
}: BanderaEquipoProps) {
  const [errored, setErrored] = useState(false)
  const { displayW, displayH, srcW, textClass } = sizes[size]

  const flag = errored ? (
    <span
      aria-hidden={showName ? 'true' : undefined}
      role={showName ? undefined : 'img'}
      aria-label={showName ? undefined : nombre}
      className="inline-flex shrink-0 items-center justify-center"
      style={{ width: displayW, height: displayH }}
    >
      🏳️
    </span>
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/w${srcW}/${codigoPais}.png`}
      // Decorative when the name is rendered alongside; otherwise carries the name.
      alt={showName ? '' : nombre}
      width={displayW}
      height={displayH}
      loading="lazy"
      onError={() => setErrored(true)}
      className="shrink-0 rounded-[2px] object-cover shadow-[0_0_0_1px_rgba(0,0,0,0.05)]"
    />
  )

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 leading-tight',
        textClass,
        className,
      )}
    >
      {flag}
      {showName && (
        <span className="truncate font-medium text-foreground">{nombre}</span>
      )}
    </span>
  )
}
