# Quiniela Mundial FIFA — Documento de Diseño

**Fecha:** 2026-05-11
**Autor:** Juan Pablo Gonzalez (en colaboración con Claude)
**Estado:** Diseño aprobado, listo para implementación

---

## 1. Resumen

Aplicación web para una quiniela del Mundial de la FIFA entre ~15 amigos. Cada participante predice el resultado de los partidos (marcador exacto + ganador), responde preguntas bonus opcionales que el admin agrega, y al inicio del Mundial predice campeón, subcampeón y goleador. Los puntos se calculan automáticamente y hay una tabla de posiciones en tiempo real.

**Restricción clave:** todo gratis, sin tarjeta de crédito.

---

## 2. Stack Técnico

| Componente | Tecnología | Plan |
|---|---|---|
| Frontend | Next.js + React | Open source |
| Hosting | Vercel | Hobby (gratis) |
| Base de datos | Supabase Postgres | Free (500 MB) |
| Autenticación | Supabase Auth (Google) | Free |
| Realtime | Supabase Realtime | Incluido en Free |
| API de fútbol | football-data.org | Free tier (10 req/min) |
| Tareas programadas | Vercel Cron Jobs | Free (2 jobs) |
| Banderas | flagcdn.com | Free, sin API key |

**Entornos:** dos proyectos Supabase separados (`quiniela-dev`, `quiniela-prod`) y dos environments en Vercel (rama `main` → producción, rama `dev` → preview). Variables de entorno gestionan los endpoints.

---

## 3. Modelo de Datos

### `usuarios`
- `id` (UUID, PK)
- `email` (string, unique)
- `nombre` (string)
- `foto_url` (string, de Google)
- `es_admin` (bool, default false)
- `created_at` (timestamp)

### `equipos`
- `id` (UUID, PK)
- `nombre` (string)
- `codigo_pais` (string, ISO-2 para flagcdn)
- `api_id` (int, referencia al ID en football-data.org)

### `partidos`
- `id` (UUID, PK)
- `api_id` (int, referencia football-data.org)
- `equipo_local_id`, `equipo_visitante_id` (FK)
- `fecha_hora_kickoff` (timestamp con timezone)
- `fase` (enum: grupos / octavos / cuartos / semis / 3er_puesto / final)
- `estado` (enum: programado / en_curso / finalizado / suspendido)
- `marcador_local_real`, `marcador_visitante_real` (int, nullable)
- `habilitado_para_predecir` (bool, default false)

### `predicciones_partido`
- `id` (UUID, PK)
- `usuario_id`, `partido_id` (FK, unique constraint en par)
- `marcador_local`, `marcador_visitante` (int)
- `puntos_obtenidos` (int, calculado)
- `editado_por_admin` (bool, default false)
- `updated_at` (timestamp)

### `preguntas_bonus`
- `id` (UUID, PK)
- `partido_id` (FK)
- `tipo` (enum: numero / over_under / si_no / opcion_multiple)
- `enunciado` (text)
- `opciones` (jsonb, para over_under y opción múltiple)
- `respuesta_correcta` (jsonb, nullable hasta que termine el partido)
- `puntos` (int, default 2)

### `predicciones_bonus`
- `id` (UUID, PK)
- `usuario_id`, `pregunta_bonus_id` (FK, unique constraint)
- `respuesta` (jsonb)
- `puntos_obtenidos` (int)
- `editado_por_admin` (bool)
- `updated_at` (timestamp)

### `predicciones_torneo`
- `id` (UUID, PK)
- `usuario_id` (FK, unique)
- `campeon_equipo_id`, `subcampeon_equipo_id` (FK, nullable)
- `goleador_nombre` (string, nullable)
- `puntos_campeon`, `puntos_subcampeon`, `puntos_goleador` (int)
- `updated_at` (timestamp)

### `configuracion`
- `id` (singleton, PK = 1)
- `puntos_marcador_exacto` (int, default 5)
- `puntos_solo_ganador` (int, default 2)
- `puntos_campeon` (int, default 10)
- `puntos_subcampeon` (int, default 5)
- `puntos_goleador` (int, default 10)
- `goleador_oficial` (string, nullable, set al final)
- `mundial_iniciado` (bool, calculado: hay algún partido con `kickoff < now()`)

### `log_auditoria`
- `id` (UUID, PK)
- `admin_id` (FK usuarios)
- `fecha` (timestamp)
- `accion` (enum: editar_prediccion / ajuste_puntos / editar_resultado / editar_config / habilitar_partido / etc.)
- `entidad_tipo`, `entidad_id`
- `valor_anterior`, `valor_nuevo` (jsonb)
- `motivo` (text, opcional)

---

## 4. Pantallas (Participante)

1. **Login** — botón único "Entrar con Google".
2. **Home / Dashboard** — próximo partido con countdown, top 5 de tabla de posiciones, accesos rápidos.
3. **Lista de partidos** — filtros por fase, estado visual (abierto/cerrado/finalizado), banderas, tu predicción y puntos.
4. **Detalle del partido** — predecir marcador + bonus si está abierto. Si ya empezó: muestra predicciones de todos + resultado real + puntos.
5. **Tabla de posiciones** — ranking realtime, columnas pos/nombre/puntos/exactos, fila propia destacada.
6. **Mi perfil** — historial, predicciones acertadas/falladas, total de puntos desglosado.
7. **Mi quiniela del Mundial** — pantalla específica para predicciones de torneo (campeón, subcampeón, goleador). Editable hasta 1 min antes del primer partido.

## 5. Pantallas (Admin)

8. **Panel admin** con sub-pantallas:
   - **Configuración**: editar sistema de puntos (bloqueado tras inicio del Mundial salvo `puntos_goleador` y similares de fin).
   - **Partidos**: importar desde API, habilitar/deshabilitar, editar resultado manualmente, recalcular puntos.
   - **Preguntas bonus**: crear/editar/eliminar por partido.
   - **Usuarios**: ver/desactivar usuarios.
   - **Predicciones**: tabla con búsqueda, permite editar cualquier predicción (queda en log).
   - **Ajustes manuales**: agregar/restar puntos a un usuario con motivo (queda en log).
   - **Log de auditoría**: tabla con todos los cambios admin.

---

## 6. Reglas de Negocio

### 6.1 Bloqueo de predicciones
- Cada predicción (partido y bonus) se bloquea **1 minuto antes** del `fecha_hora_kickoff`.
- Predicciones de torneo (campeón/subcampeón/goleador) se bloquean **1 minuto antes** del kickoff del primer partido del Mundial.
- Bloqueo aplicado en Row Level Security (RLS) de Postgres, no solo en el frontend.

### 6.2 Privacidad
- Las predicciones de otros usuarios solo son visibles **una vez que el partido haya iniciado** (`now() >= kickoff`).
- Las predicciones de torneo solo se revelan **al cierre del periodo de edición**.
- Aplicado en RLS de Postgres.

### 6.3 Sistema de puntos
| Caso | Puntos |
|---|---|
| Marcador exacto | 5 |
| Solo ganador correcto (o empate predicho con marcador distinto) | 2 |
| Sin acierto | 0 |
| Bonus | Definido por admin, default 2 |
| Campeón correcto | 10 |
| Subcampeón correcto | 5 |
| Goleador correcto | 10 |

### 6.4 Cálculo
- Se dispara cuando el admin marca el partido como `finalizado` (manual o via cron + API).
- Puntos se guardan en BD (no se recalculan al consultar la tabla — eficiente).
- Si el admin edita un resultado, se recalculan los puntos de ese partido automáticamente.

### 6.5 Tabla de posiciones
- Orden: puntos totales desc → marcadores exactos desc → nombre asc.
- Suma incluye puntos de partidos + bonus + predicciones de torneo (al final).
- Realtime: Supabase publica cambios y el frontend actualiza sin refresh.

### 6.6 Configuración editable
- Sistema de puntos (5/2/0) editable solo si `mundial_iniciado = false`.
- Puntos bonus por pregunta editables hasta que la pregunta esté cerrada (kickoff del partido).
- Goleador oficial editable después de la final (cierre del torneo).

### 6.7 Sincronización API
- Cron job Vercel cada **5 minutos** durante días con partidos.
- Trae: estado del partido, marcador.
- Si API falla, admin puede ingresar manualmente.
- Transiciones de estado disparan recálculo cuando aplica.

### 6.8 Override admin con auditoría
- Admin puede editar:
  - Marcadores reales de partidos.
  - Predicciones de cualquier usuario (marcadas con sello "✏️ Editado por admin").
  - Puntos de cualquier predicción.
  - Hacer ajustes manuales de puntos por usuario.
- Toda edición admin se registra en `log_auditoria`.

### 6.9 Persistencia ante cambios de código
- Datos viven en Supabase (separado del código).
- Cambios de schema mediante migraciones versionadas en repo.
- Cambios aditivos por defecto; destructivos requieren backup manual previo.
- Backups automáticos diarios de Supabase (retención 7 días en Free).

---

## 7. Habilitación por Fases

- **Fase de grupos**: 48 partidos importados al inicio, todos habilitados (deadline propio por kickoff).
- **Octavos a final**: admin importa partidos al concluir la fase anterior, habilita con un toggle (o "habilitar todos") cuando estén listos.
- **Tercer puesto y final**: igual que el resto.

---

## 8. Flujo del Admin Resumen

| Momento | Acciones | Tiempo estimado |
|---|---|---|
| Setup inicial | Cuentas + deploy + importar grupos + invitar participantes | 1-2 horas (con guía) |
| Antes del Mundial | Ajustar puntos si querés, crear bonus iniciales | 30 min |
| Durante grupos | Verificar resultados de API, agregar bonus, corregir si hay error | 5-10 min/día |
| Cambio de fase (x5) | Importar siguiente fase, habilitar partidos, agregar bonus | 5 min cada vez |
| Final del torneo | Cargar goleador oficial, validar tabla, anunciar ganador | 10 min |

---

## 9. Decisiones Pendientes (Implementación)

- Estructura exacta de las migraciones SQL (orden de creación de tablas, índices).
- Si usar **App Router** o **Pages Router** en Next.js (preferencia: App Router por ser estándar moderno).
- Librería de UI: Tailwind CSS + shadcn/ui (recomendado por velocidad de desarrollo y look profesional).
- Mecanismo de invitación: ¿allow-list de emails o registro abierto? (preferencia inicial: registro abierto pero solo `es_admin = false`, vos los promovés si hace falta).
- Idioma de la UI: español de Latinoamérica.

---

## 10. No Incluido (Out of Scope)

- App móvil nativa (la web responsive es suficiente).
- Notificaciones push (se puede agregar después con OneSignal free si hace falta).
- Predicción de listas de jugadores por equipo (solo nombre del goleador como texto libre).
- Sistema de pagos / premios (manejo externo entre los participantes).
- Múltiples quinielas / temporadas (un Mundial a la vez).
- Internacionalización (solo español).

---

## 11. Próximos Pasos

1. Crear un plan de implementación detallado en `docs/plans/2026-05-11-quiniela-mundial-plan.md` con tareas por fases.
2. Inicializar repo Git + estructura Next.js + Supabase local.
3. Iterar feature por feature según el plan.
