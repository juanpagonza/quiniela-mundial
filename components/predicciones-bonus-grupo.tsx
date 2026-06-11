import { cn } from '@/lib/utils'
import type { Json, TipoPreguntaBonus } from '@/lib/supabase/types'
import type { PreguntaBonusConPredicciones } from '@/lib/queries/preguntas-bonus'

interface PrediccionesBonusGrupoProps {
  preguntas: PreguntaBonusConPredicciones[]
  miUserId: string
}

export function PrediccionesBonusGrupo({
  preguntas,
  miUserId,
}: PrediccionesBonusGrupoProps) {
  if (preguntas.length === 0) return null

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-display text-xl font-medium text-foreground">
          Preguntas bonus
        </h2>
        <span className="text-xs text-muted-foreground">
          {preguntas.length === 1
            ? '1 pregunta'
            : `${preguntas.length} preguntas`}
        </span>
      </div>
      <ul className="flex flex-col gap-3">
        {preguntas.map((p) => (
          <li key={p.id}>
            <PreguntaBonusGrupoItem pregunta={p} miUserId={miUserId} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function PreguntaBonusGrupoItem({
  pregunta,
  miUserId,
}: {
  pregunta: PreguntaBonusConPredicciones
  miUserId: string
}) {
  const tieneRespuestaOficial = pregunta.respuesta_correcta != null

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm leading-relaxed text-foreground">
          {pregunta.enunciado}
        </p>
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          +{pregunta.puntos}
        </span>
      </div>

      <div className="flex items-baseline gap-2 text-xs">
        <span className="font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Respuesta correcta
        </span>
        {tieneRespuestaOficial ? (
          <span className="text-sm font-semibold text-foreground">
            {formatearRespuesta(pregunta.tipo, pregunta.respuesta_correcta)}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground italic">
            Pendiente
          </span>
        )}
      </div>

      {pregunta.predicciones.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nadie respondió esta pregunta.
        </p>
      ) : (
        <ul className="overflow-hidden rounded-xl border border-border divide-y divide-border">
          {pregunta.predicciones.map((p) => {
            const mia = p.usuario_id === miUserId
            const acerto = p.puntos_obtenidos > 0
            return (
              <li
                key={p.usuario_id}
                className={cn(
                  'flex items-center justify-between gap-4 px-4 py-2.5',
                  mia && 'bg-accent/40',
                )}
              >
                <span className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {p.nombre}
                  </span>
                  {mia && (
                    <span className="rounded-full bg-foreground px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-background">
                      Tú
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-3">
                  <span
                    className={cn(
                      'text-sm font-medium tabular-nums',
                      acerto ? 'text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {formatearRespuesta(pregunta.tipo, p.respuesta)}
                  </span>
                  {acerto ? (
                    <span className="text-xs font-medium text-foreground">
                      +{p.puntos_obtenidos} pts
                    </span>
                  ) : tieneRespuestaOficial ? (
                    <span className="text-xs text-muted-foreground">0</span>
                  ) : (
                    <span className="text-xs text-muted-foreground/60">—</span>
                  )}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/**
 * Formats a bonus answer for display per question type.
 * - numero: show the number as-is
 * - over_under: 'Más' / 'Menos'
 * - si_no: 'Sí' / 'No'
 * - opcion_multiple: the option text
 * Falls back to JSON.stringify for anything unexpected so we never crash.
 */
function formatearRespuesta(tipo: TipoPreguntaBonus, respuesta: Json): string {
  if (respuesta == null) return '—'

  if (tipo === 'numero') {
    return typeof respuesta === 'number' ? String(respuesta) : String(respuesta)
  }

  if (tipo === 'over_under') {
    if (respuesta === 'over') return 'Más'
    if (respuesta === 'under') return 'Menos'
  }

  if (tipo === 'si_no') {
    if (respuesta === 'si') return 'Sí'
    if (respuesta === 'no') return 'No'
  }

  if (tipo === 'opcion_multiple') {
    return typeof respuesta === 'string' ? respuesta : JSON.stringify(respuesta)
  }

  return typeof respuesta === 'string'
    ? respuesta
    : JSON.stringify(respuesta)
}
