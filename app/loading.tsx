/**
 * Top-level loading fallback. Next.js automatically shows this while a
 * Server Component below `app/` is suspending (e.g. waiting for an
 * `await supabase.from(...)` to resolve).
 *
 * We render a calm centered pulse — no skeleton mirroring of every page,
 * since the navigation patterns vary too much. The pulse just signals
 * "yes, something is happening" so the user doesn't think the app froze.
 */
export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Cargando"
      className="grid min-h-[60vh] place-items-center px-4"
    >
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <span
          aria-hidden="true"
          className="inline-flex size-8 animate-pulse items-center justify-center text-2xl"
        >
          ⚽
        </span>
        <span className="text-xs font-medium uppercase tracking-[0.18em]">
          Cargando…
        </span>
      </div>
    </div>
  )
}
