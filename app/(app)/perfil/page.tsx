import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { obtenerPerfilUsuario } from '@/lib/queries/perfil'
import { BanderaEquipo } from '@/components/bandera-equipo'
import { formatearKickoff } from '@/lib/dates'
import { cn } from '@/lib/utils'
import type {
  FasePartido,
  EstadoPartido,
} from '@/lib/supabase/types'
import type { MiPrediccionEnPerfil, PerfilUsuario } from '@/lib/queries/perfil'

const FASE_ORDER: FasePartido[] = [
  'grupos',
  'octavos',
  'cuartos',
  'semis',
  'tercer_puesto',
  'final',
]

const FASE_LABELS: Record<FasePartido, string> = {
  grupos: 'Grupos',
  octavos: 'Octavos de final',
  cuartos: 'Cuartos de final',
  semis: 'Semifinales',
  tercer_puesto: 'Tercer puesto',
  final: 'Final',
}

export default async function PerfilPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('nombre, foto_url, email')
    .eq('id', user.id)
    .single()

  const perfil = await obtenerPerfilUsuario(supabase, user.id)

  // Agrupar predicciones por fase, manteniendo el orden del torneo.
  const porFase = new Map<FasePartido, MiPrediccionEnPerfil[]>()
  for (const p of perfil.predicciones) {
    const arr = porFase.get(p.fase) ?? []
    arr.push(p)
    porFase.set(p.fase, arr)
  }
  const fasesConPredicciones = FASE_ORDER.filter((f) => porFase.has(f))

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        {usuario?.foto_url ? (
          <Image
            src={usuario.foto_url}
            alt=""
            width={64}
            height={64}
            className="size-16 rounded-full object-cover"
            unoptimized
          />
        ) : (
          <div
            aria-hidden="true"
            className="grid size-16 place-items-center rounded-full bg-muted text-lg font-medium text-muted-foreground"
          >
            {(usuario?.nombre ?? '?').charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Tu perfil
          </p>
          <h1 className="truncate font-display text-3xl font-medium leading-tight tracking-tight text-foreground sm:text-4xl">
            {usuario?.nombre ?? 'Tu perfil'}
          </h1>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
        <StatCard
          label="Puntos totales"
          value={perfil.puntos_totales}
          variant="hero"
        />
        <StatCard label="Marcadores exactos" value={perfil.marcadores_exactos} />
        <StatCard
          label="Aciertos"
          value={perfil.aciertos}
          sub={`de ${perfil.total_predicciones}`}
        />
      </div>

      {/* Predicciones por fase */}
      <section className="flex flex-col gap-4">
        <h2 className="font-display text-2xl font-medium text-foreground">
          Tus predicciones
        </h2>

        {fasesConPredicciones.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/40 px-6 py-12 text-center">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Sin predicciones
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Cuando hagas tu primera predicción, aparece acá.
            </p>
          </div>
        ) : (
          fasesConPredicciones.map((fase) => (
            <FaseSection
              key={fase}
              label={FASE_LABELS[fase]}
              predicciones={porFase.get(fase) ?? []}
            />
          ))
        )}
      </section>

      {/* Predicciones del torneo */}
      {perfil.mundial_iniciado && (
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-2xl font-medium text-foreground">
            Tu quiniela del Mundial
          </h2>
          {perfil.torneo ? (
            <TorneoCard torneo={perfil.torneo} />
          ) : (
            <p className="rounded-2xl border border-dashed border-border bg-muted/40 px-6 py-12 text-center text-sm text-muted-foreground">
              No predijiste campeón / subcampeón / goleador antes del cierre.
            </p>
          )}
        </section>
      )}

      {/* Transparency: when did the admin look at / edit my stuff? */}
      <AccesosAdminSection accesos={perfil.accesos_admin} />
    </div>
  )
}

function AccesosAdminSection({
  accesos,
}: {
  accesos: PerfilUsuario['accesos_admin']
}) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="font-display text-2xl font-medium text-foreground">
          Accesos del admin a tu cuenta
        </h2>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">
          Por transparencia, mostramos cuándo el admin miró o editó tus
          predicciones. Las vistas se agrupan cada 5 minutos para no
          inflar la lista cuando el admin navega entre tus partidos.
        </p>
      </div>

      {accesos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/40 px-6 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            Sin registros — el admin nunca accedió a tu cuenta.
          </p>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-border bg-card divide-y divide-border">
          {accesos.map((a) => (
            <li key={a.id} className="flex items-start gap-3 px-4 py-3">
              <span
                aria-hidden="true"
                className={cn(
                  'mt-1 inline-block size-2 shrink-0 rounded-full',
                  a.tipo === 'edicion' ? 'bg-foreground' : 'bg-muted-foreground/50',
                )}
              />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="text-sm text-foreground">
                  <span className="font-medium">{a.admin_nombre}</span>{' '}
                  <span className="text-muted-foreground">— {a.detalle}</span>
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {new Date(a.fecha).toLocaleString('es', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                  {a.tipo === 'edicion' && (
                    <>
                      <span className="mx-1.5 text-muted-foreground/40">·</span>
                      <span className="rounded-full bg-foreground/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-foreground/80">
                        Edición
                      </span>
                    </>
                  )}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function StatCard({
  label,
  value,
  sub,
  variant = 'default',
}: {
  label: string
  value: number
  sub?: string
  variant?: 'default' | 'hero'
}) {
  return (
    <div className="flex flex-col justify-between gap-1 rounded-2xl border border-border bg-card p-5">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          'font-display font-medium tabular-nums leading-none text-foreground',
          variant === 'hero' ? 'text-5xl sm:text-6xl' : 'text-4xl',
        )}
      >
        {value}
      </p>
      {sub && (
        <p className="text-xs text-muted-foreground">{sub}</p>
      )}
    </div>
  )
}

function FaseSection({
  label,
  predicciones,
}: {
  label: string
  predicciones: MiPrediccionEnPerfil[]
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label} ·{' '}
        <span className="text-foreground/80">{predicciones.length}</span>
      </p>
      <ul className="overflow-hidden rounded-2xl border border-border bg-card divide-y divide-border">
        {predicciones.map((p) => (
          <PrediccionRow key={p.partido_id} prediccion={p} />
        ))}
      </ul>
    </div>
  )
}

function PrediccionRow({ prediccion: p }: { prediccion: MiPrediccionEnPerfil }) {
  const finalizado = p.estado === 'finalizado'
  const exacto =
    finalizado &&
    p.mi_marcador_local === p.marcador_local_real &&
    p.mi_marcador_visitante === p.marcador_visitante_real

  return (
    <li>
      <Link
        href={`/partidos/${p.partido_id}`}
        className="flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-accent/40"
      >
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>{formatearKickoff(p.fecha_hora_kickoff)}</span>
          {statusLabel(p.estado)}
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <BanderaEquipo
            codigoPais={p.equipo_local.codigo_pais}
            nombre={p.equipo_local.nombre}
            size="sm"
            className="min-w-0 flex-1"
          />
          <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
            {finalizado
              ? `${p.marcador_local_real ?? '–'} – ${p.marcador_visitante_real ?? '–'}`
              : 'vs'}
          </span>
          <BanderaEquipo
            codigoPais={p.equipo_visitante.codigo_pais}
            nombre={p.equipo_visitante.nombre}
            size="sm"
            className="min-w-0 flex-1 flex-row-reverse text-right"
          />
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-border/40 pt-2 text-xs">
          <span className="text-muted-foreground">
            Tu predicción:{' '}
            <span className="font-mono font-semibold text-foreground">
              {p.mi_marcador_local} – {p.mi_marcador_visitante}
            </span>
          </span>
          {finalizado ? (
            <span
              className={cn(
                'font-medium',
                exacto
                  ? 'text-foreground'
                  : p.puntos_obtenidos > 0
                    ? 'text-foreground'
                    : 'text-muted-foreground',
              )}
            >
              {exacto && (
                <span className="mr-1 rounded-full bg-foreground px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-background">
                  Exacto
                </span>
              )}
              {p.puntos_obtenidos > 0 ? `+${p.puntos_obtenidos} pts` : '0 pts'}
            </span>
          ) : (
            <span className="text-muted-foreground italic">Pendiente</span>
          )}
        </div>
      </Link>
    </li>
  )
}

function statusLabel(estado: EstadoPartido) {
  switch (estado) {
    case 'en_curso':
      return (
        <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-destructive">
          En vivo
        </span>
      )
    case 'finalizado':
      return (
        <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-foreground/80">
          Final
        </span>
      )
    case 'suspendido':
      return (
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Suspendido
        </span>
      )
    default:
      return null
  }
}

function TorneoCard({
  torneo,
}: {
  torneo: NonNullable<Awaited<ReturnType<typeof obtenerPerfilUsuario>>['torneo']>
}) {
  const items = [
    {
      key: 'campeon',
      label: 'Campeón',
      equipo: torneo.campeon,
      texto: null as string | null,
      puntos: torneo.puntos_campeon,
    },
    {
      key: 'subcampeon',
      label: 'Subcampeón',
      equipo: torneo.subcampeon,
      texto: null as string | null,
      puntos: torneo.puntos_subcampeon,
    },
    {
      key: 'goleador',
      label: 'Goleador',
      equipo: null,
      texto: torneo.goleador_nombre,
      puntos: torneo.puntos_goleador,
    },
  ]

  return (
    <ul className="overflow-hidden rounded-2xl border border-border bg-card divide-y divide-border">
      {items.map((it) => (
        <li
          key={it.key}
          className="flex items-center justify-between gap-3 px-4 py-3"
        >
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {it.label}
          </span>
          <span className="flex items-center gap-3">
            {it.equipo ? (
              <BanderaEquipo
                codigoPais={it.equipo.codigo_pais}
                nombre={it.equipo.nombre}
                size="sm"
              />
            ) : it.texto ? (
              <span className="text-sm font-medium text-foreground">
                {it.texto}
              </span>
            ) : (
              <span className="text-sm italic text-muted-foreground">
                Sin predicción
              </span>
            )}
            {it.puntos > 0 && (
              <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                +{it.puntos}
              </span>
            )}
          </span>
        </li>
      ))}
    </ul>
  )
}
