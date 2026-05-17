import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  mundialIniciado,
  obtenerEquiposParaTorneo,
  obtenerMiTorneo,
  obtenerTorneoDeTodos,
  type TorneoDeOtro,
} from '@/lib/queries/torneo'
import { BanderaEquipo } from '@/components/bandera-equipo'
import { FormularioTorneo } from './formulario-torneo'
import { cn } from '@/lib/utils'

export default async function MiQuinielaPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const iniciado = await mundialIniciado(supabase)

  if (iniciado) {
    const todos = await obtenerTorneoDeTodos(supabase)
    return <RevelacionTorneo todos={todos} miUserId={user.id} />
  }

  const [equipos, miTorneo] = await Promise.all([
    obtenerEquiposParaTorneo(supabase),
    obtenerMiTorneo(supabase, user.id),
  ])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Mi quiniela del Mundial
        </p>
        <h1 className="font-display text-3xl font-medium leading-tight tracking-tight text-foreground sm:text-4xl">
          Campeón, subcampeón y goleador
        </h1>
        <p className="mt-2 max-w-prose text-sm text-muted-foreground">
          Estos picks se cierran un minuto antes del primer partido del
          Mundial. Podés guardar parcial y volver a editar hasta entonces.
        </p>
      </div>

      <FormularioTorneo equipos={equipos} miTorneo={miTorneo} />
    </div>
  )
}

function RevelacionTorneo({
  todos,
  miUserId,
}: {
  todos: TorneoDeOtro[]
  miUserId: string
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Mi quiniela del Mundial
        </p>
        <h1 className="font-display text-3xl font-medium leading-tight tracking-tight text-foreground sm:text-4xl">
          Predicciones del torneo
        </h1>
        <p className="mt-2 max-w-prose text-sm text-muted-foreground">
          El Mundial ya arrancó — las predicciones quedaron congeladas y son
          visibles para todos.
        </p>
      </div>

      {todos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/40 px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Nadie cargó predicciones del torneo antes del cierre.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {todos.map((t) => {
            const mia = t.usuario_id === miUserId
            return (
              <li
                key={t.usuario_id}
                className={cn(
                  'flex flex-col gap-3 rounded-2xl border border-border bg-card p-5',
                  mia && 'ring-2 ring-foreground/20',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {t.nombre}
                    </span>
                    {mia && (
                      <span className="rounded-full bg-foreground px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-background">
                        Tú
                      </span>
                    )}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <PickRow
                    label="🏆 Campeón"
                    equipo={t.campeon}
                    puntos={t.puntos_campeon}
                  />
                  <PickRow
                    label="🥈 Subcampeón"
                    equipo={t.subcampeon}
                    puntos={t.puntos_subcampeon}
                  />
                  <TextPickRow
                    label="⚽ Goleador"
                    texto={t.goleador_nombre}
                    puntos={t.puntos_goleador}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function PickRow({
  label,
  equipo,
  puntos,
}: {
  label: string
  equipo: { nombre: string; codigo_pais: string } | null
  puntos: number
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-muted/30 px-3 py-2">
      <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <span className="flex items-center justify-between gap-2">
        {equipo ? (
          <BanderaEquipo
            codigoPais={equipo.codigo_pais}
            nombre={equipo.nombre}
            size="sm"
          />
        ) : (
          <span className="text-sm italic text-muted-foreground">—</span>
        )}
        {puntos > 0 && (
          <span className="font-mono text-xs font-semibold tabular-nums text-foreground">
            +{puntos}
          </span>
        )}
      </span>
    </div>
  )
}

function TextPickRow({
  label,
  texto,
  puntos,
}: {
  label: string
  texto: string | null
  puntos: number
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-muted/30 px-3 py-2">
      <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <span className="flex items-center justify-between gap-2">
        {texto ? (
          <span className="text-sm font-medium text-foreground">{texto}</span>
        ) : (
          <span className="text-sm italic text-muted-foreground">—</span>
        )}
        {puntos > 0 && (
          <span className="font-mono text-xs font-semibold tabular-nums text-foreground">
            +{puntos}
          </span>
        )}
      </span>
    </div>
  )
}
