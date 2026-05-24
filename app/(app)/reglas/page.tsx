import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  CalendarIcon,
  ClockIcon,
  TrophyIcon,
  TargetIcon,
  ListChecksIcon,
  HelpCircleIcon,
} from 'lucide-react'

/**
 * Public-facing rules page. Pulls scoring values from `configuracion`
 * at request time so changing the admin form auto-updates the rules
 * shown to participants — no hardcoded magic numbers.
 *
 * Sits under the (app) route group, so the proxy ensures the user is
 * logged in. The page itself doesn't need user data, but it's natural
 * to gate it the same as the rest of the app.
 */
export default async function ReglasPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: config } = await supabase
    .from('configuracion')
    .select(
      'puntos_marcador_exacto, puntos_solo_ganador, puntos_campeon, puntos_subcampeon, puntos_goleador',
    )
    .eq('id', 1)
    .single()

  // Fallback if the row is missing (shouldn't happen post-Fase-2, but
  // keeps the page from crashing during early dev or after a manual
  // truncate). These match the migration defaults.
  const puntos = {
    marcador_exacto: config?.puntos_marcador_exacto ?? 5,
    solo_ganador: config?.puntos_solo_ganador ?? 2,
    campeon: config?.puntos_campeon ?? 10,
    subcampeon: config?.puntos_subcampeon ?? 5,
    goleador: config?.puntos_goleador ?? 5,
  }

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Cómo funciona
        </p>
        <h1 className="mt-1 font-display text-3xl font-medium leading-tight tracking-tight text-foreground sm:text-4xl">
          Reglas de la quiniela
        </h1>
        <p className="mt-3 max-w-prose text-sm text-muted-foreground">
          Todo lo que necesitás saber para participar. Si después de leer
          esto te queda una duda, preguntale al admin por WhatsApp.
        </p>
      </header>

      {/* Puntos */}
      <Section icon={TargetIcon} titulo="Cómo se puntúa">
        <PuntosTable
          rows={[
            {
              label: 'Marcador exacto',
              detalle: 'Acertás el resultado completo de un partido.',
              ejemplo: 'Predijiste 2-1, salió 2-1.',
              pts: puntos.marcador_exacto,
            },
            {
              label: 'Solo ganador',
              detalle: 'Acertás quién gana (o empate) pero no el marcador exacto.',
              ejemplo: 'Predijiste 2-0, salió 3-1 (ganó local igual).',
              pts: puntos.solo_ganador,
            },
            {
              label: 'Campeón del torneo',
              detalle: 'Tu pick de campeón coincide con el ganador del Mundial.',
              ejemplo: '—',
              pts: puntos.campeon,
            },
            {
              label: 'Subcampeón',
              detalle: 'Tu pick de subcampeón sale 2º.',
              ejemplo: '—',
              pts: puntos.subcampeon,
            },
            {
              label: 'Goleador',
              detalle:
                'Tu pick de goleador del torneo es el que termina como máximo goleador (case-insensitive, sin tildes — "Mbappé" == "mbappe").',
              ejemplo: '—',
              pts: puntos.goleador,
            },
          ]}
        />
        <p className="text-xs text-muted-foreground">
          También puede haber <strong>preguntas bonus</strong> en algunos partidos —
          el admin las agrega antes del kickoff. Cada una vale puntos distintos
          (los ves en el card de la pregunta).
        </p>
      </Section>

      {/* Cuándo cierran */}
      <Section icon={ClockIcon} titulo="Cuándo cierran las predicciones">
        <ul className="flex flex-col gap-3">
          <Bullet
            titulo="Cada partido"
            detalle="Podés cargar y editar tu predicción hasta 1 minuto antes del kickoff. Después se congela. Si no predijiste para entonces, ese partido te queda en cero."
          />
          <Bullet
            titulo="Pick de campeón / subcampeón / goleador"
            detalle="Editable hasta el primer partido del Mundial. Cuando arranca el Jue 11 Jun a las 13:00 ARG, se cierra para siempre. Si no predijiste para entonces, esos puntos te quedan en cero."
          />
          <Bullet
            titulo="Preguntas bonus"
            detalle="Cierran junto con su partido (1 min antes del kickoff)."
          />
        </ul>
      </Section>

      {/* Mi Quiniela */}
      <Section icon={TrophyIcon} titulo="Tu quiniela del Mundial">
        <p className="text-sm text-foreground">
          Aparte de predecir partido por partido, cada participante elige al
          principio del torneo:
        </p>
        <ul className="ml-4 flex list-disc flex-col gap-1 text-sm text-foreground">
          <li>El <strong>campeón</strong> (1 equipo)</li>
          <li>El <strong>subcampeón</strong> (otro equipo distinto)</li>
          <li>El <strong>goleador</strong> del torneo (escribís el nombre)</li>
        </ul>
        <p className="text-sm text-muted-foreground">
          Esos picks suman puntos al final del Mundial.
          <br />
          <span className="text-foreground/80">Importante:</span> hasta que arranque el
          primer partido nadie ve tu pick. Cuando empieza el Mundial, todas las
          predicciones del torneo se vuelven visibles para el grupo (así nadie
          puede "espiar" antes y copiarse).
        </p>
        <p className="text-sm text-muted-foreground">
          Andá a <Link href="/mi-quiniela">Mi Quiniela</Link> para cargarlo.
        </p>
      </Section>

      {/* Partidos */}
      <Section icon={CalendarIcon} titulo="Cómo predecir un partido">
        <ol className="ml-4 flex list-decimal flex-col gap-2 text-sm text-foreground">
          <li>
            Andá a <Link href="/partidos">Partidos</Link>. Vas a ver el fixture
            agrupado por fase (Grupos / Octavos / etc.).
          </li>
          <li>
            Click en el partido que quieras predecir.
          </li>
          <li>
            Cargás el marcador que esperás (ej: 2-1) y guardás. Lo podés
            editar todas las veces que quieras hasta 1 min antes del kickoff.
          </li>
          <li>
            Si el partido tiene preguntas bonus, las ves debajo del formulario
            de marcador. Cada una se guarda por separado.
          </li>
        </ol>
      </Section>

      {/* Tabla */}
      <Section icon={ListChecksIcon} titulo="Tabla y puntos">
        <p className="text-sm text-foreground">
          La <Link href="/tabla">tabla de posiciones</Link> se actualiza en tiempo
          real (no hace falta recargar). Cuando un partido termina, los puntos
          de todos los que predijeron se calculan automáticamente y aparecen
          en la tabla.
        </p>
        <p className="text-sm text-muted-foreground">
          En tu <Link href="/perfil">perfil</Link> podés ver el desglose: cuántos
          marcadores exactos llevás, cuántos aciertos parciales, y el detalle
          de cada predicción.
        </p>
      </Section>

      {/* FAQ */}
      <Section icon={HelpCircleIcon} titulo="Preguntas frecuentes">
        <Faq
          q="¿Puedo cambiar mi predicción después de cargarla?"
          a="Sí, todas las veces que quieras, hasta 1 min antes del kickoff de ese partido."
        />
        <Faq
          q="¿Y si no predigo un partido?"
          a="No pasa nada — quedás en 0 puntos para ese partido y seguís compitiendo en los otros."
        />
        <Faq
          q="¿Los demás ven mi predicción antes del partido?"
          a="No. Mientras el partido no haya empezado, solo vos ves tu predicción. Cuando arranca el partido, todas las predicciones quedan visibles para todos."
        />
        <Faq
          q="¿Y los picks de campeón / subcampeón / goleador?"
          a="Mismo principio: nadie los ve hasta que arranque el Mundial. Después se vuelven visibles."
        />
        <Faq
          q='¿"Mbappé" y "mbappe" cuentan como la misma respuesta para el goleador?'
          a="Sí. La comparación es insensible a mayúsculas y tildes. Lo importante es escribir bien el apellido."
        />
        <Faq
          q="¿Quién decide los resultados oficiales?"
          a="Vienen de football-data.org, una API pública que se actualiza cada 5 minutos automáticamente. Si por algún motivo hay un error, el admin lo puede corregir manualmente (y queda registrado en el log de auditoría)."
        />
        <Faq
          q="Me equivoqué cargando un pick — ¿el admin puede arreglarlo?"
          a="Sí, podés pedirle al admin que edite tu predicción. Cualquier edición queda marcada como “editada por admin” en tu perfil para que sea transparente."
        />
      </Section>
    </div>
  )
}

// ----- Reusable bits -----------------------------------------------------

function Section({
  icon: Icon,
  titulo,
  children,
}: {
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  titulo: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-2">
        <Icon className="size-5 text-muted-foreground" aria-hidden />
        <h2 className="font-display text-xl font-medium text-foreground">
          {titulo}
        </h2>
      </div>
      {children}
    </section>
  )
}

function PuntosTable({
  rows,
}: {
  rows: Array<{ label: string; detalle: string; ejemplo: string; pts: number }>
}) {
  return (
    <ul className="overflow-hidden rounded-xl border border-border bg-background/60 divide-y divide-border">
      {rows.map((r) => (
        <li
          key={r.label}
          className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 px-4 py-3 sm:grid-cols-[1fr_auto_3rem]"
        >
          <span className="text-sm font-medium text-foreground">{r.label}</span>
          <span className="hidden text-xs italic text-muted-foreground sm:block">
            {r.ejemplo}
          </span>
          <span className="row-span-2 self-center text-right font-mono text-lg font-semibold tabular-nums text-foreground">
            +{r.pts}
          </span>
          <span className="col-span-2 text-xs text-muted-foreground sm:col-span-1">
            {r.detalle}
          </span>
        </li>
      ))}
    </ul>
  )
}

function Bullet({ titulo, detalle }: { titulo: string; detalle: string }) {
  return (
    <li className="rounded-xl bg-muted/40 px-4 py-3">
      <p className="text-sm font-medium text-foreground">{titulo}</p>
      <p className="mt-0.5 text-sm text-muted-foreground">{detalle}</p>
    </li>
  )
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <details className="group rounded-xl bg-muted/40 px-4 py-3">
      <summary className="flex cursor-pointer list-none items-start gap-2 text-sm font-medium text-foreground">
        <span className="text-muted-foreground/60 transition-transform group-open:rotate-90">
          ▸
        </span>
        <span>{q}</span>
      </summary>
      <p className="mt-2 ml-5 text-sm text-muted-foreground">{a}</p>
    </details>
  )
}

// Link component for inline text — defaults to underlined accent style.
// Pulled to the bottom so the JSX above stays readable.
function Link({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <a
      href={href}
      className="font-medium text-foreground underline-offset-4 hover:underline"
    >
      {children}
    </a>
  )
}
