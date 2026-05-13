import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

type DateLike = Date | string

function toDate(d: DateLike): Date {
  return typeof d === 'string' ? parseISO(d) : d
}

function capitalizeFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/**
 * "Mar 16 Jun, 14:00 (tu hora)" — short day, day-of-month, short month,
 * 24-hour time in the user's local timezone. The "(tu hora)" suffix makes
 * explicit that this is the reader's local time, not the venue's.
 */
export function formatearKickoff(d: DateLike): string {
  const date = toDate(d)
  const dia = capitalizeFirst(format(date, 'EEE', { locale: es }))
  const diaNum = format(date, 'd')
  const mes = capitalizeFirst(format(date, 'MMM', { locale: es }))
  const hora = format(date, 'HH:mm')
  return `${dia} ${diaNum} ${mes}, ${hora} (tu hora)`
}

/**
 * Human-readable countdown to (or "from") kickoff. Examples:
 *   "3d"             — more than 24 hours away
 *   "2h 15min"       — between 1 hour and 24 hours away
 *   "30min"          — between 1 minute and 1 hour
 *   "Faltan 30s"     — last minute
 *   "Empezó hace pocos segundos" — within the first minute past kickoff
 *   "Empezó hace 5min" / "Empezó hace 2h" — further past
 *
 * `ahora` is injected only for tests. Defaults to the current time.
 */
export function tiempoHastaKickoff(
  d: DateLike,
  ahora: Date = new Date(),
): string {
  const kickoff = toDate(d)
  const diffMs = kickoff.getTime() - ahora.getTime()
  const diffSec = Math.floor(diffMs / 1000)

  if (diffSec <= 0) {
    const absSec = Math.abs(diffSec)
    if (absSec < 60) return 'Empezó hace pocos segundos'
    const absMin = Math.floor(absSec / 60)
    if (absMin < 60) return `Empezó hace ${absMin}min`
    const absHr = Math.floor(absMin / 60)
    return `Empezó hace ${absHr}h`
  }

  if (diffSec < 60) return `Faltan ${diffSec}s`

  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}min`

  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) {
    const restMin = diffMin - diffHr * 60
    return restMin === 0 ? `${diffHr}h` : `${diffHr}h ${restMin}min`
  }

  const diffDay = Math.floor(diffHr / 24)
  return `${diffDay}d`
}

/**
 * True if predictions on this kickoff are locked. Matches the RLS rule:
 * blocked once `now() >= kickoff - 1 minute`, so the UI agrees with what
 * the database will accept.
 */
export function estaBloqueado(
  kickoff: DateLike,
  ahora: Date = new Date(),
): boolean {
  const k = toDate(kickoff)
  return ahora.getTime() >= k.getTime() - 60_000
}
