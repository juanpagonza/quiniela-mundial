interface ProximamenteProps {
  titulo: string
  detalle: string
}

export function Proximamente({ titulo, detalle }: ProximamenteProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-border bg-muted/40 px-6 py-12 text-center">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        Próximamente
      </p>
      <h1 className="font-display text-3xl font-medium leading-tight tracking-tight text-foreground">
        {titulo}
      </h1>
      <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
        {detalle}
      </p>
    </div>
  )
}
