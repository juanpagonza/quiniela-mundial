'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangleIcon, RotateCcwIcon, HomeIcon } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'

/**
 * Global error boundary. Catches any uncaught throw in a Server or Client
 * component below `app/`. The default Next.js error page is unstyled and
 * scary in prod — this gives the user a calm "something broke, try again"
 * card on-brand with the rest of the app.
 *
 * The `error.digest` is the redacted ID that links back to the server
 * stack trace in Vercel logs — we surface it so the admin can grep when
 * a user reports an issue.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log to whatever sink we have — in prod Vercel ingests console.error
    // automatically and surfaces the digest alongside.
    console.error('[error.tsx]', error)
  }, [error])

  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <div className="flex max-w-md flex-col items-center gap-5 rounded-2xl border border-border bg-card p-8 text-center">
        <span
          aria-hidden="true"
          className="grid size-12 place-items-center rounded-full bg-destructive/10 text-destructive"
        >
          <AlertTriangleIcon className="size-6" />
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-2xl font-medium leading-tight text-foreground">
            Algo se rompió.
          </h1>
          <p className="text-sm text-muted-foreground">
            Probá de nuevo. Si sigue pasando, avisale al admin con el código
            de abajo.
          </p>
          {error.digest && (
            <p className="mt-1 font-mono text-[11px] text-muted-foreground/80">
              {error.digest}
            </p>
          )}
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
          <Button onClick={reset} className="gap-2">
            <RotateCcwIcon className="size-4" aria-hidden="true" />
            Reintentar
          </Button>
          <Link href="/" className={buttonVariants({ variant: 'outline' }) + ' gap-2'}>
            <HomeIcon className="size-4" aria-hidden="true" />
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  )
}
