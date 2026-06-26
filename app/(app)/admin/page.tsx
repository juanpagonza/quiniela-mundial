import Link from 'next/link'
import { requireAdmin } from '@/lib/auth/admin'
import { obtenerAdminStats } from '@/lib/queries/admin-stats'
import { BanderaEquipo } from '@/components/bandera-equipo'
import { formatearKickoff, tiempoHastaKickoff } from '@/lib/dates'
import {
  ArrowRightIcon,
  CalendarIcon,
  ClipboardListIcon,
  SettingsIcon,
  ShieldIcon,
  TrophyIcon,
  UsersIcon,
} from 'lucide-react'
import type { FasePartido } from '@/lib/supabase/types'
import type { LucideIcon } from 'lucide-react'

const FASE_LABELS: Record<FasePartido, string> = {
  grupos: 'Grupos',
  dieciseisavos: 'Dieciseisavos',
  octavos: 'Octavos',
  cuartos: 'Cuartos',
  semis: 'Semifinales',
  tercer_puesto: 'Tercer puesto',
  final: 'Final',
}

export default async function AdminPage() {
  const { supabase } = await requireAdmin()
  const stats = await obtenerAdminStats(supabase)

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Admin
        </p>
        <h1 className="mt-1 font-display text-3xl font-medium leading-tight tracking-tight text-foreground sm:text-4xl">
          Panel de control
        </h1>
      </div>

      {/* Stats grid */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Participantes" value={stats.total_usuarios} sub={`${stats.total_admins} admin${stats.total_admins === 1 ? '' : 's'}`} />
        <StatCard label="Partidos" value={stats.total_partidos} sub={`${stats.partidos_habilitados} habilitados`} />
        <StatCard label="Finalizados" value={stats.partidos_finalizados} sub={stats.total_partidos > 0 ? `${Math.round((stats.partidos_finalizados / stats.total_partidos) * 100)}% del total` : '—'} />
        <StatCard label="Bonus activas" value={stats.total_preguntas_bonus} sub="preguntas" />
        <StatCard label="Predicciones partido" value={stats.total_predicciones_partido} sub="totales" />
        <StatCard label="Predicciones bonus" value={stats.total_predicciones_bonus} sub="totales" />
        <StatCard label="Predicciones torneo" value={stats.total_predicciones_torneo} sub={`/ ${stats.total_usuarios}`} />
        <StatCard label="Tu rol" value="Admin" textValue />
      </section>

      {/* Próximo partido */}
      {stats.proximo_partido && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-xl font-medium text-foreground">
            Próximo partido
          </h2>
          <Link
            href={`/admin/partidos/${stats.proximo_partido.id}`}
            className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 transition-all hover:border-foreground/30 hover:shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                {formatearKickoff(stats.proximo_partido.fecha_hora_kickoff)}
                <span className="mx-1.5 text-muted-foreground/40">·</span>
                <span className="font-medium text-foreground/80">
                  {FASE_LABELS[stats.proximo_partido.fase]}
                </span>
              </span>
              <span className="text-xs font-medium text-foreground">
                {tiempoHastaKickoff(stats.proximo_partido.fecha_hora_kickoff)}
              </span>
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <BanderaEquipo
                codigoPais={stats.proximo_partido.equipo_local.codigo_pais}
                nombre={stats.proximo_partido.equipo_local.nombre}
                size="md"
                className="min-w-0 flex-1"
              />
              <span className="font-display text-base font-light text-muted-foreground">
                vs
              </span>
              <BanderaEquipo
                codigoPais={stats.proximo_partido.equipo_visitante.codigo_pais}
                nombre={stats.proximo_partido.equipo_visitante.nombre}
                size="md"
                className="min-w-0 flex-1 flex-row-reverse text-right"
              />
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-2 text-xs">
              <span className="text-muted-foreground">
                Visible:{' '}
                <span
                  className={
                    stats.proximo_partido.habilitado_para_predecir
                      ? 'font-medium text-foreground'
                      : 'font-medium text-destructive'
                  }
                >
                  {stats.proximo_partido.habilitado_para_predecir ? 'Sí' : 'No'}
                </span>
              </span>
              <span className="inline-flex items-center gap-1 font-medium text-foreground transition-transform group-hover:translate-x-0.5">
                Administrar
                <ArrowRightIcon className="size-3" aria-hidden="true" />
              </span>
            </div>
          </Link>
        </section>
      )}

      {/* Quick links */}
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl font-medium text-foreground">
          Atajos
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <QuickLink
            href="/admin/configuracion"
            icon={SettingsIcon}
            titulo="Configuración"
            detalle="Editar sistema de puntos y goleador oficial."
          />
          <QuickLink
            href="/admin/partidos"
            icon={CalendarIcon}
            titulo="Partidos"
            detalle="Importar fixture, abrir partidos, editar resultados."
          />
          <QuickLink
            href="/admin/predicciones"
            icon={ClipboardListIcon}
            titulo="Predicciones"
            detalle="Editar predicciones de cualquier participante."
          />
          <QuickLink
            href="/admin/torneo"
            icon={TrophyIcon}
            titulo="Predicciones de torneo"
            detalle="Editar campeón, subcampeón y goleador de un participante."
          />
          <QuickLink
            href="/admin/auditoria"
            icon={ShieldIcon}
            titulo="Auditoría"
            detalle="Historial de cambios hechos desde el admin."
          />
        </div>
      </section>
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
  textValue,
}: {
  label: string
  value: number | string
  sub?: string
  textValue?: boolean
}) {
  return (
    <div className="flex flex-col justify-between gap-1 rounded-2xl border border-border bg-card p-4">
      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p
        className={
          'font-display font-medium leading-none text-foreground ' +
          (textValue ? 'text-2xl' : 'text-3xl tabular-nums')
        }
      >
        {value}
      </p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

function QuickLink({
  href,
  icon: Icon,
  titulo,
  detalle,
}: {
  href: string
  icon: LucideIcon
  titulo: string
  detalle: string
}) {
  return (
    <Link
      href={href}
      className="group flex items-start justify-between gap-3 rounded-2xl border border-border bg-card p-5 transition-all hover:border-foreground/30 hover:shadow-sm"
    >
      <div className="flex items-start gap-3">
        <Icon
          className="mt-0.5 size-5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
          aria-hidden="true"
        />
        <div className="flex flex-col gap-1">
          <span className="font-display text-base font-medium text-foreground">
            {titulo}
          </span>
          <span className="text-sm text-muted-foreground">{detalle}</span>
        </div>
      </div>
      <ArrowRightIcon
        className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
        aria-hidden="true"
      />
    </Link>
  )
}
