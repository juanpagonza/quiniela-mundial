import Link from 'next/link'
import { SearchXIcon, HomeIcon } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'

/**
 * Global 404 page. Catches `notFound()` calls from any route and
 * any URL that doesn't match a defined page. The closest thematic
 * thing for this app is "ese partido no existe" but we keep it
 * generic since the same handler covers /admin/partidos/[id], /perfil
 * for a deleted user, etc.
 */
export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <div className="flex max-w-md flex-col items-center gap-5 rounded-2xl border border-border bg-card p-8 text-center">
        <span
          aria-hidden="true"
          className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground"
        >
          <SearchXIcon className="size-6" />
        </span>
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            404
          </p>
          <h1 className="font-display text-2xl font-medium leading-tight text-foreground">
            No encontramos esa página.
          </h1>
          <p className="text-sm text-muted-foreground">
            Puede ser un link viejo o un partido que ya no existe.
          </p>
        </div>
        <Link href="/" className={buttonVariants() + ' gap-2'}>
          <HomeIcon className="size-4" aria-hidden="true" />
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}
