import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/auth/admin'
import {
  obtenerPartidoAdmin,
  obtenerPreguntasBonusAdmin,
  type PreguntaBonusAdmin,
} from '@/lib/queries/admin-partido'
import { BanderaEquipo } from '@/components/bandera-equipo'
import { FormularioBonusDialog } from '@/components/admin/formulario-bonus'
import { SetearRespuestaBonus } from '@/components/admin/setear-respuesta-bonus'
import { EliminarPreguntaBonus } from '@/components/admin/eliminar-pregunta-bonus'
import { formatearKickoff } from '@/lib/dates'
import { ChevronLeftIcon } from 'lucide-react'
import type { FasePartido, Json, TipoPreguntaBonus } from '@/lib/supabase/types'

const FASE_LABELS: Record<FasePartido, string> = {
  grupos: 'Grupos',
  octavos: 'Octavos',
  cuartos: 'Cuartos',
  semis: 'Semifinales',
  tercer_puesto: 'Tercer puesto',
  final: 'Final',
}

const TIPO_LABELS: Record<TipoPreguntaBonus, string> = {
  numero: 'Número',
  over_under: 'Más / Menos',
  si_no: 'Sí / No',
  opcion_multiple: 'Opción múltiple',
}

export default async function AdminPartidoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { supabase } = await requireAdmin()

  const [partido, preguntas] = await Promise.all([
    obtenerPartidoAdmin(supabase, id),
    obtenerPreguntasBonusAdmin(supabase, id),
  ])

  if (!partido) notFound()

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin"
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeftIcon className="size-4" aria-hidden="true" />
        Volver al admin
      </Link>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Admin · {FASE_LABELS[partido.fase]} ·{' '}
          {formatearKickoff(partido.fecha_hora_kickoff)}
        </p>
        <div className="flex items-center gap-4">
          <BanderaEquipo
            codigoPais={partido.equipo_local.codigo_pais}
            nombre={partido.equipo_local.nombre}
            size="md"
          />
          <span className="font-display text-lg text-muted-foreground">vs</span>
          <BanderaEquipo
            codigoPais={partido.equipo_visitante.codigo_pais}
            nombre={partido.equipo_visitante.nombre}
            size="md"
          />
        </div>
      </div>

      {/* Resumen del partido — la edición full viene en Fase 8.4 */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Estado" value={partido.estado} />
        <Stat
          label="Visible"
          value={partido.habilitado_para_predecir ? 'Sí' : 'No'}
        />
        <Stat
          label="Marcador real"
          value={
            partido.marcador_local_real != null &&
            partido.marcador_visitante_real != null
              ? `${partido.marcador_local_real} – ${partido.marcador_visitante_real}`
              : '—'
          }
        />
        <Stat label="Bonus" value={String(preguntas.length)} />
      </section>

      {/* Sección de bonus */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-2xl font-medium text-foreground">
            Preguntas bonus
          </h2>
          <FormularioBonusDialog partidoId={partido.id} />
        </div>

        {preguntas.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/40 px-6 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No hay preguntas bonus para este partido todavía.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {preguntas.map((p) => (
              <li key={p.id}>
                <PreguntaBonusAdminCard
                  pregunta={p}
                  partidoId={partido.id}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-border bg-card p-4">
      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="font-mono text-sm font-semibold tabular-nums text-foreground">
        {value}
      </p>
    </div>
  )
}

function PreguntaBonusAdminCard({
  pregunta,
  partidoId,
}: {
  pregunta: PreguntaBonusAdmin
  partidoId: string
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {TIPO_LABELS[pregunta.tipo]} · +{pregunta.puntos} pts
          </p>
          <p className="text-sm leading-relaxed text-foreground">
            {pregunta.enunciado}
          </p>
          {pregunta.opciones && pregunta.opciones.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Opciones: {pregunta.opciones.join(' · ')}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <FormularioBonusDialog partidoId={partidoId} pregunta={pregunta} />
          <EliminarPreguntaBonus
            preguntaId={pregunta.id}
            partidoId={partidoId}
            enunciado={pregunta.enunciado}
          />
        </div>
      </div>

      <div className="border-t border-border/60 pt-3">
        <SetearRespuestaBonus
          preguntaId={pregunta.id}
          partidoId={partidoId}
          tipo={pregunta.tipo}
          opciones={pregunta.opciones}
          respuestaActual={pregunta.respuesta_correcta}
        />
        {pregunta.respuesta_correcta != null && (
          <p className="mt-2 text-xs text-muted-foreground">
            Actual:{' '}
            <span className="font-mono font-medium text-foreground">
              {formatRespuestaActual(pregunta.respuesta_correcta)}
            </span>
          </p>
        )}
      </div>
    </div>
  )
}

function formatRespuestaActual(r: Json): string {
  if (typeof r === 'number') return String(r)
  if (typeof r === 'string') return r
  return JSON.stringify(r)
}
