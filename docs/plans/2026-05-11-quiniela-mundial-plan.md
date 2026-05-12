# Plan de Implementación — Quiniela Mundial FIFA

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Construir una webapp gratuita para que 15 personas hagan una quiniela del Mundial de la FIFA con marcadores, preguntas bonus, predicciones de torneo, tabla en tiempo real y panel de admin.

**Architecture:** Next.js (App Router) en Vercel + Supabase (Postgres + Auth + Realtime). API football-data.org via Vercel Cron. Dos entornos (dev/prod). Diseño mobile-first.

**Tech Stack (actual al 2026-05-11):** Next.js 16.2.6 (App Router, Turbopack), React 19.2.4, TypeScript 5, Tailwind CSS v4 (config CSS-first, sin `tailwind.config.ts`), shadcn/ui (style `base-nova` con `@base-ui/react` como primitives, NO Radix UI), Supabase JS SDK (`@supabase/supabase-js` + `@supabase/ssr`), Vercel (Hobby), football-data.org, flagcdn.com.

**Nota sobre divergencia del stack:** Este plan se escribió asumiendo Next 14 / React 18 / Tailwind v3 / shadcn-Radix. `create-next-app@latest` y `shadcn@latest` ahora instalan versiones más nuevas. Las divergencias clave:
- Tailwind v4 → no hay `tailwind.config.ts`; el theme vive en `app/globals.css` con `@theme inline`.
- shadcn moderno → usa `@base-ui/react` (de MUI) en lugar de Radix. Algunas APIs difieren (ej: `render` prop en lugar de `asChild`, `data-open`/`data-closed` en lugar de `data-state="open"`). Componentes disponibles: button, card, input, label, table, dialog, dropdown-menu, sonner (NO `toast`), tabs, select. Otros (Accordion, Avatar, Slider, etc.) pueden no estar disponibles en Base UI — verificar si una tarea futura los pide.
- `toast` → reemplazado por `sonner` (requiere `<ThemeProvider>` de `next-themes` envolviendo `app/layout.tsx` cuando se monte `<Toaster />`).

**Documento de diseño asociado:** [2026-05-11-quiniela-mundial-design.md](./2026-05-11-quiniela-mundial-design.md)

---

## Notas para el implementador

- **Idioma UI:** Español de Latinoamérica.
- **TDD donde aplique:** lógica de scoring, locking, RLS — sí. UI puramente visual — smoke tests/integración.
- **Commits frecuentes:** después de cada tarea completa que pase tests.
- **No `git push --force` ni hooks bypass.**
- **Backups:** antes de cualquier migración destructiva en `quiniela-prod`, descargar backup desde panel Supabase.
- **Secretos:** ningún `.env`, API key, ni service_role key debe quedar en el repo. Usar `.env.local` (gitignored) y panel de Vercel.

---

## Fase 0 — Setup de proyecto e infraestructura

**Objetivo:** Tener un esqueleto desplegado en Vercel que diga "Hola Mundo" en producción con auth de Google funcionando.

### Task 0.1: Inicializar repo Git y proyecto Next.js

**Files:**
- Create: `package.json`, `tsconfig.json`, `.gitignore`, `next.config.js`, `app/page.tsx`, `README.md`

**Steps:**
1. En el directorio del proyecto correr: `npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*" --eslint`
2. Verificar que `npm run dev` levanta la app en `http://localhost:3000`
3. `git init` + crear `.gitignore` que incluya `.env*.local`, `node_modules`, `.vercel`, `.next`
4. Primer commit: `chore: scaffold Next.js project`

### Task 0.2: Crear cuentas externas y proyectos

**Manual (no requiere código):**
1. Crear cuenta GitHub si no existe — pushear el repo a un repositorio privado nuevo `quiniela-mundial`.
2. Crear cuenta Vercel (login con GitHub) — conectar el repo `quiniela-mundial`. Verificar que se publica automáticamente en una URL tipo `quiniela-mundial.vercel.app`.
3. Crear cuenta Supabase — crear dos proyectos: `quiniela-dev` y `quiniela-prod`. Guardar las URLs y `anon keys` y `service_role keys` de cada uno.
4. Crear cuenta football-data.org — generar API key gratis.

**Documentar en `.env.example`** (commitéable, sin valores reales):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
FOOTBALL_DATA_API_KEY=
```

### Task 0.3: Instalar dependencias core

**Steps:**
1. `npm install @supabase/supabase-js @supabase/ssr`
2. `npm install -D @types/node`
3. Inicializar shadcn/ui: `npx shadcn@latest init` con defaults (estilo "default", color "slate")
4. Agregar componentes base: `npx shadcn@latest add button card input label table dialog dropdown-menu toast tabs select`
5. Commit: `chore: install supabase and shadcn/ui`

### Task 0.4: Configurar cliente de Supabase

**Files:**
- Create: `lib/supabase/client.ts` (cliente browser)
- Create: `lib/supabase/server.ts` (cliente server-side con cookies)
- Create: `lib/supabase/middleware.ts` (refresh de sesión)
- Create: `middleware.ts` (en root)

**Pattern:** seguir docs oficiales de `@supabase/ssr` para Next.js App Router. Los tres archivos exportan funciones distintas según contexto (Client Component / Server Component / Route Handler / middleware).

**Steps:**
1. Crear los 4 archivos con el código standard de `@supabase/ssr`.
2. Configurar variables en `.env.local` apuntando a `quiniela-dev`.
3. Commit: `feat: configure supabase clients`

### Task 0.5: Configurar Google OAuth en Supabase

**Manual:**
1. En Google Cloud Console crear proyecto, habilitar OAuth, crear credenciales OAuth Client ID (Web Application).
2. Authorized redirect URIs: `https://<proyecto-dev>.supabase.co/auth/v1/callback` y `https://<proyecto-prod>.supabase.co/auth/v1/callback` y `http://localhost:3000/auth/callback`.
3. En Supabase dashboard (ambos proyectos) → Authentication → Providers → Google → pegar Client ID y Secret.
4. Probar a mano que el flow OAuth funcione en Supabase con un usuario de prueba.

### Task 0.6: Página de login y callback

**Files:**
- Create: `app/login/page.tsx` (UI con botón "Entrar con Google")
- Create: `app/auth/callback/route.ts` (intercambia code por sesión)
- Create: `app/auth/signout/route.ts` (cerrar sesión)
- Modify: `middleware.ts` (proteger rutas no-login)

**Steps:**
1. Escribir UI minimalista de login (`<Button onClick={signIn}>Entrar con Google</Button>`).
2. `signIn` llama a `supabase.auth.signInWithOAuth({ provider: 'google' })`.
3. Callback route handler intercambia `code` por sesión y redirige a `/`.
4. Middleware verifica sesión y redirige a `/login` si no hay sesión (excepto para `/login`, `/auth/*`).
5. Test manual: entrar local con Google, ver que llega al home.
6. Commit: `feat: google oauth login`

### Task 0.7: Deploy inicial a producción

**Manual:**
1. Push branch `main` → Vercel publica.
2. En Vercel dashboard → Settings → Environment Variables: cargar las 4 variables apuntando a `quiniela-prod`.
3. Redeploy.
4. Verificar que el login OAuth funcione en la URL de producción.

**Checkpoint:** ✅ App pública con login funcionando.

---

## Fase 1 — Schema de Base de Datos

**Objetivo:** Tener todas las tablas creadas en `quiniela-dev` con migraciones versionadas en el repo.

### Task 1.1: Setup de migraciones con Supabase CLI

**Files:**
- Create: `supabase/config.toml`
- Create: `supabase/migrations/.gitkeep`

**Steps:**
1. Instalar Supabase CLI globalmente (o via npx).
2. `supabase init` en root del proyecto.
3. `supabase login` con la cuenta.
4. `supabase link --project-ref <dev-ref>` para vincular el proyecto dev.
5. Commit: `chore: initialize supabase migrations`

### Task 1.2: Migración inicial — tipos enum

**File:** `supabase/migrations/00001_create_enums.sql`

```sql
CREATE TYPE fase_partido AS ENUM ('grupos', 'octavos', 'cuartos', 'semis', 'tercer_puesto', 'final');
CREATE TYPE estado_partido AS ENUM ('programado', 'en_curso', 'finalizado', 'suspendido');
CREATE TYPE tipo_pregunta_bonus AS ENUM ('numero', 'over_under', 'si_no', 'opcion_multiple');
CREATE TYPE accion_auditoria AS ENUM (
  'editar_prediccion_partido',
  'editar_prediccion_bonus',
  'ajuste_puntos_manual',
  'editar_resultado_partido',
  'editar_config',
  'habilitar_partido',
  'crear_pregunta_bonus',
  'editar_pregunta_bonus',
  'eliminar_pregunta_bonus'
);
```

**Steps:**
1. Crear archivo.
2. `supabase db push` para aplicar a dev.
3. Verificar en dashboard de Supabase.
4. Commit: `feat(db): create enum types`

### Task 1.3: Migración — tabla `usuarios`

**File:** `supabase/migrations/00002_create_usuarios.sql`

```sql
CREATE TABLE usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  foto_url TEXT,
  es_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_usuarios_es_admin ON usuarios(es_admin) WHERE es_admin = true;

-- Trigger para crear fila en usuarios al crearse un auth.user
CREATE OR REPLACE FUNCTION handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO usuarios (id, email, nombre, foto_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

**Steps:**
1. Aplicar migración.
2. Hacer logout/login con Google, verificar que aparece fila en `usuarios`.
3. Promoverte a admin manualmente: `UPDATE usuarios SET es_admin = true WHERE email = 'juanpa6@gmail.com';`
4. Commit: `feat(db): create usuarios table with auth trigger`

### Task 1.4: Migración — tabla `equipos`

**File:** `supabase/migrations/00003_create_equipos.sql`

```sql
CREATE TABLE equipos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  codigo_pais TEXT NOT NULL,  -- ISO-2 (ej: 'ar', 'br') para flagcdn
  api_id INTEGER UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Steps:**
1. Aplicar.
2. Commit: `feat(db): create equipos table`

### Task 1.5: Migración — tabla `partidos`

**File:** `supabase/migrations/00004_create_partidos.sql`

```sql
CREATE TABLE partidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_id INTEGER UNIQUE NOT NULL,
  equipo_local_id UUID NOT NULL REFERENCES equipos(id),
  equipo_visitante_id UUID NOT NULL REFERENCES equipos(id),
  fecha_hora_kickoff TIMESTAMPTZ NOT NULL,
  fase fase_partido NOT NULL,
  estado estado_partido NOT NULL DEFAULT 'programado',
  marcador_local_real INTEGER,
  marcador_visitante_real INTEGER,
  habilitado_para_predecir BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_partidos_kickoff ON partidos(fecha_hora_kickoff);
CREATE INDEX idx_partidos_fase ON partidos(fase);
CREATE INDEX idx_partidos_estado ON partidos(estado);
```

**Steps:**
1. Aplicar.
2. Commit: `feat(db): create partidos table`

### Task 1.6: Migración — tablas de predicciones

**File:** `supabase/migrations/00005_create_predicciones.sql`

```sql
CREATE TABLE predicciones_partido (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  partido_id UUID NOT NULL REFERENCES partidos(id) ON DELETE CASCADE,
  marcador_local INTEGER NOT NULL CHECK (marcador_local >= 0),
  marcador_visitante INTEGER NOT NULL CHECK (marcador_visitante >= 0),
  puntos_obtenidos INTEGER NOT NULL DEFAULT 0,
  editado_por_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(usuario_id, partido_id)
);

CREATE INDEX idx_predicciones_usuario ON predicciones_partido(usuario_id);
CREATE INDEX idx_predicciones_partido ON predicciones_partido(partido_id);

CREATE TABLE predicciones_torneo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
  campeon_equipo_id UUID REFERENCES equipos(id),
  subcampeon_equipo_id UUID REFERENCES equipos(id),
  goleador_nombre TEXT,
  puntos_campeon INTEGER NOT NULL DEFAULT 0,
  puntos_subcampeon INTEGER NOT NULL DEFAULT 0,
  puntos_goleador INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Steps:**
1. Aplicar.
2. Commit: `feat(db): create predicciones tables`

### Task 1.7: Migración — preguntas bonus y predicciones bonus

**File:** `supabase/migrations/00006_create_bonus.sql`

```sql
CREATE TABLE preguntas_bonus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partido_id UUID NOT NULL REFERENCES partidos(id) ON DELETE CASCADE,
  tipo tipo_pregunta_bonus NOT NULL,
  enunciado TEXT NOT NULL,
  opciones JSONB,  -- null para tipo 'numero', array para resto
  respuesta_correcta JSONB,  -- null hasta que termine el partido
  puntos INTEGER NOT NULL DEFAULT 2,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_preguntas_bonus_partido ON preguntas_bonus(partido_id);

CREATE TABLE predicciones_bonus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  pregunta_bonus_id UUID NOT NULL REFERENCES preguntas_bonus(id) ON DELETE CASCADE,
  respuesta JSONB NOT NULL,
  puntos_obtenidos INTEGER NOT NULL DEFAULT 0,
  editado_por_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(usuario_id, pregunta_bonus_id)
);

CREATE INDEX idx_predicciones_bonus_usuario ON predicciones_bonus(usuario_id);
CREATE INDEX idx_predicciones_bonus_pregunta ON predicciones_bonus(pregunta_bonus_id);
```

**Steps:**
1. Aplicar.
2. Commit: `feat(db): create bonus questions and predictions`

### Task 1.8: Migración — configuración global y auditoría

**File:** `supabase/migrations/00007_create_config_y_auditoria.sql`

```sql
CREATE TABLE configuracion (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  puntos_marcador_exacto INTEGER NOT NULL DEFAULT 5,
  puntos_solo_ganador INTEGER NOT NULL DEFAULT 2,
  puntos_campeon INTEGER NOT NULL DEFAULT 10,
  puntos_subcampeon INTEGER NOT NULL DEFAULT 5,
  puntos_goleador INTEGER NOT NULL DEFAULT 10,
  goleador_oficial TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO configuracion (id) VALUES (1);

CREATE TABLE log_auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES usuarios(id),
  fecha TIMESTAMPTZ NOT NULL DEFAULT now(),
  accion accion_auditoria NOT NULL,
  entidad_tipo TEXT NOT NULL,
  entidad_id UUID,
  valor_anterior JSONB,
  valor_nuevo JSONB,
  motivo TEXT
);

CREATE INDEX idx_log_fecha ON log_auditoria(fecha DESC);
CREATE INDEX idx_log_admin ON log_auditoria(admin_id);
```

**Steps:**
1. Aplicar.
2. Commit: `feat(db): create config and audit log`

### Task 1.9: Generar tipos TypeScript del schema

**File:** `lib/database.types.ts` (generado)

**Steps:**
1. `npx supabase gen types typescript --linked > lib/database.types.ts`
2. Crear helper `lib/supabase/types.ts` que re-exporta los tipos comúnmente usados.
3. Commit: `feat: generate db types`

**Checkpoint:** ✅ Schema completo en dev, tipos en frontend.

---

## Fase 2 — Row Level Security (RLS)

**Objetivo:** Que las reglas de privacidad y bloqueo estén aplicadas en BD, no solo en frontend.

### Task 2.1: Habilitar RLS y políticas para `usuarios`

**File:** `supabase/migrations/00008_rls_usuarios.sql`

```sql
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- Todos los autenticados pueden leer todos los usuarios (para tabla de posiciones)
CREATE POLICY "usuarios_select_all" ON usuarios
  FOR SELECT TO authenticated USING (true);

-- Solo admin puede modificar es_admin
CREATE POLICY "usuarios_update_admin" ON usuarios
  FOR UPDATE TO authenticated
  USING ( (SELECT es_admin FROM usuarios WHERE id = auth.uid()) )
  WITH CHECK ( (SELECT es_admin FROM usuarios WHERE id = auth.uid()) );
```

**Steps:**
1. Aplicar.
2. Test manual con SQL editor de Supabase impersonando usuario no-admin.
3. Commit: `feat(db): RLS para usuarios`

### Task 2.2: RLS para `equipos`, `partidos`, `configuracion`

**File:** `supabase/migrations/00009_rls_lectura_publica.sql`

```sql
ALTER TABLE equipos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "equipos_select" ON equipos FOR SELECT TO authenticated USING (true);

ALTER TABLE partidos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "partidos_select" ON partidos FOR SELECT TO authenticated USING (true);
CREATE POLICY "partidos_admin_write" ON partidos
  FOR ALL TO authenticated
  USING ( (SELECT es_admin FROM usuarios WHERE id = auth.uid()) )
  WITH CHECK ( (SELECT es_admin FROM usuarios WHERE id = auth.uid()) );

ALTER TABLE configuracion ENABLE ROW LEVEL SECURITY;
CREATE POLICY "config_select" ON configuracion FOR SELECT TO authenticated USING (true);
CREATE POLICY "config_admin_write" ON configuracion
  FOR ALL TO authenticated
  USING ( (SELECT es_admin FROM usuarios WHERE id = auth.uid()) )
  WITH CHECK ( (SELECT es_admin FROM usuarios WHERE id = auth.uid()) );
```

**Steps:**
1. Aplicar.
2. Commit: `feat(db): RLS para tablas de lectura pública`

### Task 2.3: RLS para `predicciones_partido` (con bloqueo de tiempo y privacidad)

**File:** `supabase/migrations/00010_rls_predicciones_partido.sql`

```sql
ALTER TABLE predicciones_partido ENABLE ROW LEVEL SECURITY;

-- SELECT: ves tus propias predicciones siempre, las de otros solo si el partido empezó
CREATE POLICY "predicciones_select" ON predicciones_partido
  FOR SELECT TO authenticated
  USING (
    usuario_id = auth.uid()
    OR (
      SELECT fecha_hora_kickoff <= now()
      FROM partidos
      WHERE partidos.id = predicciones_partido.partido_id
    )
    OR (SELECT es_admin FROM usuarios WHERE id = auth.uid())
  );

-- INSERT/UPDATE: solo tus propias predicciones, solo si falta más de 1 min para el partido
CREATE POLICY "predicciones_insert" ON predicciones_partido
  FOR INSERT TO authenticated
  WITH CHECK (
    usuario_id = auth.uid()
    AND (
      SELECT habilitado_para_predecir = true
        AND fecha_hora_kickoff > now() + interval '1 minute'
      FROM partidos
      WHERE partidos.id = predicciones_partido.partido_id
    )
  );

CREATE POLICY "predicciones_update_own" ON predicciones_partido
  FOR UPDATE TO authenticated
  USING (
    usuario_id = auth.uid()
    AND NOT editado_por_admin  -- no puede sobreescribir edición admin sin... eh, lo permitimos
  )
  WITH CHECK (
    usuario_id = auth.uid()
    AND (
      SELECT habilitado_para_predecir = true
        AND fecha_hora_kickoff > now() + interval '1 minute'
      FROM partidos
      WHERE partidos.id = predicciones_partido.partido_id
    )
  );

-- Admin override (sin restricción de tiempo)
CREATE POLICY "predicciones_admin_all" ON predicciones_partido
  FOR ALL TO authenticated
  USING ( (SELECT es_admin FROM usuarios WHERE id = auth.uid()) )
  WITH CHECK ( (SELECT es_admin FROM usuarios WHERE id = auth.uid()) );
```

**Steps:**
1. Aplicar.
2. **Tests SQL:**
   - Insertar partido futuro (kickoff > 1 min) → debe poder insertar predicción.
   - Insertar partido futuro a 30 segundos → debe fallar.
   - Intentar leer predicción ajena de partido no iniciado → debe devolver 0 filas.
   - Intentar leer predicción ajena de partido iniciado → debe devolver fila.
3. Commit: `feat(db): RLS con bloqueo de tiempo en predicciones_partido`

### Task 2.4: RLS para `predicciones_torneo` (bloqueo al primer partido)

**File:** `supabase/migrations/00011_rls_predicciones_torneo.sql`

```sql
-- Función helper: ¿ya empezó el mundial?
CREATE OR REPLACE FUNCTION mundial_iniciado() RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM partidos
    WHERE fecha_hora_kickoff <= now() + interval '1 minute'
  );
$$ LANGUAGE SQL STABLE;

ALTER TABLE predicciones_torneo ENABLE ROW LEVEL SECURITY;

-- SELECT: tuyas siempre, las de otros solo después del cierre
CREATE POLICY "torneo_select" ON predicciones_torneo
  FOR SELECT TO authenticated
  USING (
    usuario_id = auth.uid()
    OR mundial_iniciado()
    OR (SELECT es_admin FROM usuarios WHERE id = auth.uid())
  );

-- INSERT/UPDATE: solo tuyas, solo antes del cierre
CREATE POLICY "torneo_upsert" ON predicciones_torneo
  FOR ALL TO authenticated
  USING (usuario_id = auth.uid() AND NOT mundial_iniciado())
  WITH CHECK (usuario_id = auth.uid() AND NOT mundial_iniciado());

CREATE POLICY "torneo_admin_all" ON predicciones_torneo
  FOR ALL TO authenticated
  USING ( (SELECT es_admin FROM usuarios WHERE id = auth.uid()) )
  WITH CHECK ( (SELECT es_admin FROM usuarios WHERE id = auth.uid()) );
```

**Steps:**
1. Aplicar.
2. Test manual con SQL editor.
3. Commit: `feat(db): RLS para predicciones_torneo`

### Task 2.5: RLS para preguntas bonus y predicciones bonus

**File:** `supabase/migrations/00012_rls_bonus.sql`

```sql
ALTER TABLE preguntas_bonus ENABLE ROW LEVEL SECURITY;
CREATE POLICY "preguntas_bonus_select" ON preguntas_bonus FOR SELECT TO authenticated USING (true);
CREATE POLICY "preguntas_bonus_admin_write" ON preguntas_bonus
  FOR ALL TO authenticated
  USING ( (SELECT es_admin FROM usuarios WHERE id = auth.uid()) )
  WITH CHECK ( (SELECT es_admin FROM usuarios WHERE id = auth.uid()) );

ALTER TABLE predicciones_bonus ENABLE ROW LEVEL SECURITY;
CREATE POLICY "predicciones_bonus_select" ON predicciones_bonus
  FOR SELECT TO authenticated
  USING (
    usuario_id = auth.uid()
    OR (
      SELECT p.fecha_hora_kickoff <= now()
      FROM preguntas_bonus pb
      JOIN partidos p ON p.id = pb.partido_id
      WHERE pb.id = predicciones_bonus.pregunta_bonus_id
    )
    OR (SELECT es_admin FROM usuarios WHERE id = auth.uid())
  );

CREATE POLICY "predicciones_bonus_upsert" ON predicciones_bonus
  FOR ALL TO authenticated
  USING (
    usuario_id = auth.uid()
    AND (
      SELECT p.fecha_hora_kickoff > now() + interval '1 minute'
      FROM preguntas_bonus pb
      JOIN partidos p ON p.id = pb.partido_id
      WHERE pb.id = predicciones_bonus.pregunta_bonus_id
    )
  )
  WITH CHECK (
    usuario_id = auth.uid()
    AND (
      SELECT p.fecha_hora_kickoff > now() + interval '1 minute'
      FROM preguntas_bonus pb
      JOIN partidos p ON p.id = pb.partido_id
      WHERE pb.id = predicciones_bonus.pregunta_bonus_id
    )
  );

CREATE POLICY "predicciones_bonus_admin_all" ON predicciones_bonus
  FOR ALL TO authenticated
  USING ( (SELECT es_admin FROM usuarios WHERE id = auth.uid()) )
  WITH CHECK ( (SELECT es_admin FROM usuarios WHERE id = auth.uid()) );
```

**Steps:**
1. Aplicar.
2. Commit: `feat(db): RLS bonus`

### Task 2.6: RLS para `log_auditoria`

**File:** `supabase/migrations/00013_rls_log.sql`

```sql
ALTER TABLE log_auditoria ENABLE ROW LEVEL SECURITY;

-- Solo admin lee y solo via service_role (server-side) escribe
CREATE POLICY "log_admin_select" ON log_auditoria
  FOR SELECT TO authenticated
  USING ( (SELECT es_admin FROM usuarios WHERE id = auth.uid()) );
-- No CREATE POLICY for INSERT → solo service_role puede escribir
```

**Steps:**
1. Aplicar.
2. Commit: `feat(db): RLS log auditoria`

**Checkpoint:** ✅ BD totalmente blindada. Imposible saltarse reglas desde el cliente.

---

## Fase 3 — Integración con football-data.org

**Objetivo:** Poder importar el fixture completo del Mundial y sincronizar resultados automáticamente.

### Task 3.1: Cliente de la API y tipos

**Files:**
- Create: `lib/football-api/client.ts` (fetch wrapper con auth header)
- Create: `lib/football-api/types.ts` (types de la response)
- Test: `lib/football-api/__tests__/client.test.ts`

**Steps:**
1. Instalar `vitest` y `@testing-library/react`: `npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom`
2. Configurar `vitest.config.ts`.
3. Escribir test: el cliente añade el header `X-Auth-Token` correctamente.
4. Implementar cliente.
5. Tests pasan.
6. Commit: `feat: football-data api client`

### Task 3.2: Función "importar fixture"

**Files:**
- Create: `lib/football-api/import-fixture.ts`
- Test: `lib/football-api/__tests__/import-fixture.test.ts`

**Comportamiento:**
- Recibe ID de competición (Mundial 2026 = `WC` o ID específico, verificar en docs).
- Llama a `/competitions/WC/matches`.
- Para cada match: upsert equipo local + visitante + partido.
- Idempotente: si ya existen, actualiza (excepto `marcador_*_real` si ya está finalizado y editado manualmente).

**Steps:**
1. Test con mock de fetch que devuelve 2 partidos → verifica que se insertan correctamente.
2. Test idempotencia: correr 2 veces no duplica.
3. Implementar.
4. Tests pasan.
5. Commit: `feat: importar fixture desde API`

### Task 3.3: Función "sincronizar resultados"

**Files:**
- Create: `lib/football-api/sync-results.ts`
- Test: `lib/football-api/__tests__/sync-results.test.ts`

**Comportamiento:**
- Trae partidos de la API filtrando por estado `IN_PLAY`, `PAUSED`, `FINISHED`.
- Para cada uno, actualiza `estado`, `marcador_local_real`, `marcador_visitante_real`.
- Si el partido pasa a `finalizado` por primera vez, dispara cálculo de puntos (Fase 5).

**Steps:**
1. Tests con varios escenarios.
2. Implementar.
3. Commit: `feat: sincronizar resultados`

### Task 3.4: Endpoint admin "Importar fixture"

**Files:**
- Create: `app/api/admin/importar-fixture/route.ts`

**Comportamiento:**
- POST handler.
- Verifica que el usuario sea admin (via session + `usuarios.es_admin`).
- Llama a `importFixture()`.
- Devuelve count de partidos importados.

**Steps:**
1. Implementar.
2. Test manual con curl/Postman impersonando admin.
3. Commit: `feat: endpoint admin para importar fixture`

### Task 3.5: Cron job de sincronización

**Files:**
- Create: `app/api/cron/sync-results/route.ts`
- Modify: `vercel.json` (configurar cron)

**`vercel.json`:**
```json
{
  "crons": [{
    "path": "/api/cron/sync-results",
    "schedule": "*/5 * * * *"
  }]
}
```

**Endpoint:**
- Verifica header `Authorization: Bearer <CRON_SECRET>` (set en Vercel env vars).
- Llama a `syncResults()` con service_role key (para bypasear RLS).
- Loggea cuántos partidos actualizó.

**Steps:**
1. Generar `CRON_SECRET` random y subir a Vercel env vars.
2. Implementar.
3. Deploy + verificar en Vercel logs que se ejecuta cada 5 min.
4. Commit: `feat: cron job sync resultados`

**Checkpoint:** ✅ Datos del Mundial entran solos. Admin puede forzar import.

---

## Fase 4 — Predicciones de Partido (MVP del participante)

**Objetivo:** Un usuario puede entrar, ver los partidos, predecir, y ver sus predicciones.

### Task 4.1: Layout base y navegación

**Files:**
- Modify: `app/layout.tsx` (con shell de la app: header, nav, toaster)
- Create: `components/Header.tsx` (logo, usuario, logout)
- Create: `components/MobileNav.tsx` (nav inferior en mobile)
- Create: `app/(app)/layout.tsx` (route group autenticado)

**Steps:**
1. Implementar layout responsive con shadcn.
2. Header muestra nombre + foto del usuario logueado, botón logout.
3. Nav: Home / Partidos / Tabla / Mi Quiniela / (Admin si corresponde).
4. Commit: `feat: layout y navegación`

### Task 4.2: Helper de fecha/timezone y formatos

**Files:**
- Create: `lib/dates.ts`
- Test: `lib/__tests__/dates.test.ts`

**Funciones:**
- `formatearKickoff(date)`: "Sáb 16 Jun, 14:30 (tu hora)"
- `tiempoHastaKickoff(date)`: "2h 15min" o "Faltan 30s" o "Empezó hace 5min"
- `estaBloqueado(kickoff)`: `now() >= kickoff - 1 min`
- Usar `date-fns` con locale `es`.

**Steps:**
1. `npm install date-fns`
2. Tests primero (varios escenarios).
3. Implementar.
4. Commit: `feat: helpers de fecha`

### Task 4.3: Componente `BanderaEquipo` y `NombreConBandera`

**Files:**
- Create: `components/BanderaEquipo.tsx`

**Comportamiento:**
- Recibe `codigoPais` y `nombre`.
- Renderiza `<img src="https://flagcdn.com/w40/{codigoPais}.png" alt={nombre} />` + texto.
- Manejo de error: si falla la imagen, muestra emoji 🏳️.

**Steps:**
1. Implementar.
2. Commit: `feat: componente bandera`

### Task 4.4: Listado de partidos

**Files:**
- Create: `app/(app)/partidos/page.tsx`
- Create: `app/(app)/partidos/PartidosList.tsx` (Client Component con filtros)
- Create: `lib/queries/partidos.ts` (función para fetch)

**Comportamiento:**
- Server Component fetch inicial.
- Filtros por fase (tabs de shadcn).
- Cada partido card muestra: banderas + nombres, kickoff, estado, tu predicción si existe, puntos si finalizado.
- Click en partido → navega a `/partidos/[id]`.

**Steps:**
1. Implementar fetch.
2. Implementar UI.
3. Test manual con datos seed.
4. Commit: `feat: listado de partidos`

### Task 4.5: Detalle de partido y predicción

**Files:**
- Create: `app/(app)/partidos/[id]/page.tsx` (Server Component)
- Create: `app/(app)/partidos/[id]/FormularioPrediccion.tsx` (Client)
- Create: `lib/actions/predicciones.ts` (Server Actions)

**Comportamiento:**
- Si partido `abierto`: muestra formulario con dos inputs numéricos.
- Si bloqueado: mensaje "Predicciones cerradas".
- Si iniciado: muestra tabla con predicciones de todos.
- Submit → server action que hace upsert via RLS (la BD bloquea automáticamente si ya pasó el deadline).

**Steps:**
1. Server action `upsertPrediccionPartido(partidoId, local, visitante)`.
2. Test de la action (con cliente mockeado o test integración con BD dev).
3. Formulario con countdown live.
4. Commit: `feat: predicción de partido`

### Task 4.6: Home / Dashboard

**Files:**
- Create: `app/(app)/page.tsx`
- Create: `components/ProximoPartido.tsx`
- Create: `components/MiniLeaderboard.tsx`

**Comportamiento:**
- Server Component fetch:
  - Próximo partido (kickoff > now, orden asc, limit 1).
  - Top 5 leaderboard.
  - Cuenta de predicciones pendientes del usuario.
- Cards con accesos rápidos.

**Steps:**
1. Implementar.
2. Commit: `feat: dashboard home`

**Checkpoint:** ✅ Participante puede entrar, ver partidos, predecir. Sin puntos todavía.

---

## Fase 5 — Cálculo de Puntos y Tabla de Posiciones

**Objetivo:** Los puntos se calculan automáticamente al cerrar un partido, y la tabla se actualiza en tiempo real.

### Task 5.1: Función SQL `calcular_puntos_prediccion`

**File:** `supabase/migrations/00014_funcion_calcular_puntos.sql`

```sql
CREATE OR REPLACE FUNCTION calcular_puntos_partido(p_partido_id UUID) RETURNS VOID AS $$
DECLARE
  v_local INT;
  v_visitante INT;
  v_pts_exacto INT;
  v_pts_ganador INT;
BEGIN
  SELECT marcador_local_real, marcador_visitante_real INTO v_local, v_visitante
  FROM partidos WHERE id = p_partido_id;

  IF v_local IS NULL OR v_visitante IS NULL THEN
    RAISE EXCEPTION 'Partido sin resultado real';
  END IF;

  SELECT puntos_marcador_exacto, puntos_solo_ganador INTO v_pts_exacto, v_pts_ganador
  FROM configuracion WHERE id = 1;

  UPDATE predicciones_partido SET puntos_obtenidos = CASE
    WHEN marcador_local = v_local AND marcador_visitante = v_visitante THEN v_pts_exacto
    WHEN sign(marcador_local - marcador_visitante) = sign(v_local - v_visitante) THEN v_pts_ganador
    ELSE 0
  END,
  updated_at = now()
  WHERE partido_id = p_partido_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Steps:**
1. Aplicar.
2. Test SQL: insertar partido + predicciones, set resultado, llamar función, verificar puntos.
3. Commit: `feat(db): función calcular puntos partido`

### Task 5.2: Trigger automático cuando finaliza un partido

**File:** `supabase/migrations/00015_trigger_calcular_puntos.sql`

```sql
CREATE OR REPLACE FUNCTION trigger_calcular_puntos() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.estado = 'finalizado'
     AND NEW.marcador_local_real IS NOT NULL
     AND NEW.marcador_visitante_real IS NOT NULL
     AND (
       OLD.estado != 'finalizado'
       OR OLD.marcador_local_real IS DISTINCT FROM NEW.marcador_local_real
       OR OLD.marcador_visitante_real IS DISTINCT FROM NEW.marcador_visitante_real
     ) THEN
    PERFORM calcular_puntos_partido(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_partido_finalizado
  AFTER UPDATE ON partidos
  FOR EACH ROW
  EXECUTE FUNCTION trigger_calcular_puntos();
```

**Steps:**
1. Aplicar.
2. Test: insertar partido + predicciones, marcar finalizado → verificar que se actualizaron los puntos.
3. Commit: `feat(db): trigger automático cálculo puntos`

### Task 5.3: Vista `leaderboard` y endpoint

**File:** `supabase/migrations/00016_vista_leaderboard.sql`

```sql
CREATE OR REPLACE VIEW leaderboard AS
SELECT
  u.id AS usuario_id,
  u.nombre,
  u.foto_url,
  COALESCE(SUM(pp.puntos_obtenidos), 0) +
    COALESCE(SUM(pb.puntos_obtenidos), 0) +
    COALESCE(pt.puntos_campeon + pt.puntos_subcampeon + pt.puntos_goleador, 0) AS puntos_totales,
  COUNT(*) FILTER (
    WHERE pp.marcador_local = (SELECT marcador_local_real FROM partidos WHERE id = pp.partido_id)
    AND pp.marcador_visitante = (SELECT marcador_visitante_real FROM partidos WHERE id = pp.partido_id)
  ) AS marcadores_exactos
FROM usuarios u
LEFT JOIN predicciones_partido pp ON pp.usuario_id = u.id
LEFT JOIN predicciones_bonus pb ON pb.usuario_id = u.id
LEFT JOIN predicciones_torneo pt ON pt.usuario_id = u.id
GROUP BY u.id, u.nombre, u.foto_url, pt.puntos_campeon, pt.puntos_subcampeon, pt.puntos_goleador
ORDER BY puntos_totales DESC, marcadores_exactos DESC, u.nombre ASC;
```

**Steps:**
1. Aplicar.
2. Test con datos seed.
3. Commit: `feat(db): vista leaderboard`

### Task 5.4: Página de tabla de posiciones con Realtime

**Files:**
- Create: `app/(app)/tabla/page.tsx` (Server)
- Create: `app/(app)/tabla/LeaderboardRealtime.tsx` (Client con suscripción)

**Comportamiento:**
- Inicial fetch server-side.
- Cliente se suscribe a cambios en `predicciones_partido`, `predicciones_bonus`, `predicciones_torneo`, `partidos`.
- Si cambia algo, re-fetch del leaderboard (no toda la tabla, solo recalcular).
- Fila propia destacada con borde de color.

**Steps:**
1. Implementar.
2. Test manual: abrir 2 ventanas, en una marcar partido finalizado vía SQL, ver actualización en la otra.
3. Commit: `feat: tabla de posiciones realtime`

### Task 5.5: Mi perfil con desglose

**Files:**
- Create: `app/(app)/perfil/page.tsx`

**Comportamiento:**
- Server Component fetch:
  - Stats: total puntos, marcadores exactos, ganadores correctos.
  - Lista de tus predicciones agrupadas por fase.
  - Predicciones de torneo si ya están bloqueadas.

**Steps:**
1. Implementar.
2. Commit: `feat: pagina perfil`

**Checkpoint:** ✅ Quiniela funcional para participantes con puntos automáticos. MVP CASI listo.

---

## Fase 6 — Preguntas Bonus

**Objetivo:** Admin puede crear preguntas bonus por partido, usuarios pueden responder, puntos se calculan automáticamente.

### Task 6.1: Función SQL `calcular_puntos_bonus`

**File:** `supabase/migrations/00017_funcion_puntos_bonus.sql`

Función que dado un `pregunta_bonus_id` y la respuesta correcta, recorre las predicciones y asigna puntos según tipo:
- `numero`: exact match → puntos completos.
- `over_under`: match opción → puntos completos.
- `si_no`: match → puntos completos.
- `opcion_multiple`: match → puntos completos.

**Steps:**
1. Implementar.
2. Tests SQL para cada tipo.
3. Commit: `feat(db): función puntos bonus`

### Task 6.2: Trigger al setear `respuesta_correcta`

**File:** `supabase/migrations/00018_trigger_bonus.sql`

```sql
CREATE OR REPLACE FUNCTION trigger_calcular_bonus() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.respuesta_correcta IS NOT NULL
     AND (OLD.respuesta_correcta IS NULL OR OLD.respuesta_correcta != NEW.respuesta_correcta) THEN
    PERFORM calcular_puntos_bonus(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_bonus_respondida
  AFTER UPDATE ON preguntas_bonus
  FOR EACH ROW
  EXECUTE FUNCTION trigger_calcular_bonus();
```

**Steps:**
1. Aplicar + test.
2. Commit: `feat(db): trigger bonus`

### Task 6.3: UI participante para predecir bonus

**Files:**
- Modify: `app/(app)/partidos/[id]/FormularioPrediccion.tsx` para incluir preguntas bonus debajo del marcador.

**Comportamiento por tipo:**
- `numero`: input numérico
- `over_under`: dos botones radio
- `si_no`: dos botones radio
- `opcion_multiple`: select o radio

**Steps:**
1. Componente genérico `<PreguntaBonus pregunta onChange />`.
2. Integrar al formulario.
3. Commit: `feat: UI predecir bonus`

### Task 6.4: UI admin para CRUD de preguntas bonus

**Files:**
- Create: `app/(app)/admin/partidos/[id]/page.tsx` (admin: ver/editar partido + bonus)
- Create: `components/admin/FormularioBonus.tsx`

**Steps:**
1. Lista de preguntas existentes para el partido.
2. Botón "Agregar pregunta" → modal con campos según tipo.
3. Editar / eliminar (con confirmación).
4. Cuando termina el partido, admin puede setear `respuesta_correcta`.
5. Commit: `feat: admin CRUD bonus`

**Checkpoint:** ✅ Bonus completos.

---

## Fase 7 — Predicciones de Torneo

**Objetivo:** Pantalla "Mi quiniela del Mundial" para predecir campeón/subcampeón/goleador antes del primer partido.

### Task 7.1: Pantalla del participante

**Files:**
- Create: `app/(app)/mi-quiniela/page.tsx`
- Create: `app/(app)/mi-quiniela/FormularioTorneo.tsx`

**Comportamiento:**
- Server Component checkea si ya empezó el Mundial.
- Si no: muestra formulario con dropdown campeón, dropdown subcampeón, input texto goleador.
- Si sí: muestra las predicciones congeladas + las de todos los demás (revelación post-cierre).

**Steps:**
1. Implementar.
2. Test: intentar guardar después del cierre → debe fallar (la RLS bloquea).
3. Commit: `feat: mi quiniela del mundial`

### Task 7.2: Función SQL `calcular_puntos_torneo`

**File:** `supabase/migrations/00019_funcion_puntos_torneo.sql`

```sql
CREATE OR REPLACE FUNCTION calcular_puntos_torneo() RETURNS VOID AS $$
DECLARE
  v_campeon UUID;
  v_subcampeon UUID;
  v_goleador TEXT;
  v_pts_camp INT;
  v_pts_subcamp INT;
  v_pts_gol INT;
BEGIN
  -- Determinar campeón (ganador de la final)
  SELECT
    CASE WHEN marcador_local_real > marcador_visitante_real THEN equipo_local_id
         ELSE equipo_visitante_id END,
    CASE WHEN marcador_local_real > marcador_visitante_real THEN equipo_visitante_id
         ELSE equipo_local_id END
  INTO v_campeon, v_subcampeon
  FROM partidos WHERE fase = 'final' AND estado = 'finalizado' LIMIT 1;

  SELECT goleador_oficial, puntos_campeon, puntos_subcampeon, puntos_goleador
  INTO v_goleador, v_pts_camp, v_pts_subcamp, v_pts_gol
  FROM configuracion WHERE id = 1;

  UPDATE predicciones_torneo SET
    puntos_campeon = CASE WHEN campeon_equipo_id = v_campeon THEN v_pts_camp ELSE 0 END,
    puntos_subcampeon = CASE WHEN subcampeon_equipo_id = v_subcampeon THEN v_pts_subcamp ELSE 0 END,
    puntos_goleador = CASE
      WHEN v_goleador IS NOT NULL
       AND lower(unaccent(goleador_nombre)) = lower(unaccent(v_goleador))
      THEN v_pts_gol ELSE 0 END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Nota:** requiere extensión `unaccent`. Agregar `CREATE EXTENSION IF NOT EXISTS unaccent;` al inicio.

**Steps:**
1. Aplicar + test.
2. Commit: `feat(db): función puntos torneo`

### Task 7.3: Endpoint admin "Cerrar torneo"

**File:** `app/api/admin/cerrar-torneo/route.ts`

**Comportamiento:**
- Admin setea `goleador_oficial` en config.
- Llama a `calcular_puntos_torneo()`.
- Cierra la quiniela.

**Steps:**
1. Implementar.
2. Commit: `feat: cerrar torneo`

**Checkpoint:** ✅ Quiniela del mundial completa con campeón/subcampeón/goleador.

---

## Fase 8 — Panel Admin Completo

**Objetivo:** Admin tiene control total via UI (sin tocar BD).

### Task 8.1: Layout admin y guard

**Files:**
- Create: `app/(app)/admin/layout.tsx`
- Modify: middleware (verifica `es_admin` para `/admin/*`)

**Steps:**
1. Implementar.
2. Test: usuario no-admin que entra a `/admin` → redirect a `/`.
3. Commit: `feat: layout admin`

### Task 8.2: Dashboard admin

**Files:**
- Create: `app/(app)/admin/page.tsx`

**Cards:**
- Total usuarios, total predicciones, próximo partido, etc.
- Accesos rápidos a las sub-secciones.

**Steps:**
1. Implementar.
2. Commit: `feat: admin dashboard`

### Task 8.3: Admin de configuración

**Files:**
- Create: `app/(app)/admin/configuracion/page.tsx`

**Comportamiento:**
- Form para editar sistema de puntos.
- Si `mundial_iniciado()` retorna true → readonly + mensaje "ya empezó el mundial".
- Edición de `goleador_oficial` siempre disponible (solo se usa al final).
- Cada edición → log de auditoría.

**Steps:**
1. Implementar.
2. Test: intentar editar puntos con mundial iniciado → debe fallar.
3. Commit: `feat: admin config`

### Task 8.4: Admin de partidos

**Files:**
- Create: `app/(app)/admin/partidos/page.tsx`

**Funciones:**
- Botón "Importar fixture".
- Tabla de partidos con filtros.
- Por partido: toggle habilitado, editar resultado manual, marcar finalizado.
- Editar resultado → log de auditoría + trigger recalculo.

**Steps:**
1. Implementar.
2. Commit: `feat: admin partidos`

### Task 8.5: Admin de predicciones (editar cualquier usuario)

**Files:**
- Create: `app/(app)/admin/predicciones/page.tsx`

**Funciones:**
- Búsqueda por usuario + partido.
- Editar predicción → marca `editado_por_admin = true` + log.
- Recalcula puntos automáticamente del partido si ya está finalizado.

**Steps:**
1. Implementar.
2. Test integral: editar → verificar sello y log.
3. Commit: `feat: admin editar predicciones`

### Task 8.6: Ajustes manuales de puntos

**Files:**
- Create: `app/(app)/admin/ajustes/page.tsx`
- Create: `supabase/migrations/00020_table_ajustes_manuales.sql`

```sql
CREATE TABLE ajustes_puntos_manuales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES usuarios(id),
  puntos INTEGER NOT NULL,  -- positivo o negativo
  motivo TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ajustes_puntos_manuales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ajustes_select" ON ajustes_puntos_manuales FOR SELECT TO authenticated USING (true);
CREATE POLICY "ajustes_admin_write" ON ajustes_puntos_manuales
  FOR ALL TO authenticated
  USING ( (SELECT es_admin FROM usuarios WHERE id = auth.uid()) )
  WITH CHECK ( (SELECT es_admin FROM usuarios WHERE id = auth.uid()) );
```

**Cambio en vista leaderboard:** sumar `SUM(ajustes.puntos)` al total.

**Steps:**
1. Aplicar migración.
2. Actualizar vista leaderboard.
3. UI form para crear ajuste.
4. Commit: `feat: ajustes manuales`

### Task 8.7: Log de auditoría UI

**Files:**
- Create: `app/(app)/admin/auditoria/page.tsx`

**Comportamiento:**
- Tabla paginada con filtros (fecha, admin, acción).
- Cada fila expandible para ver `valor_anterior` / `valor_nuevo`.

**Steps:**
1. Implementar.
2. Commit: `feat: UI log auditoría`

### Task 8.8: Helpers de servidor para escribir al log

**File:** `lib/audit.ts`

Función `registrarAccion({ adminId, accion, entidadTipo, entidadId, valorAnterior, valorNuevo, motivo })` que usa el cliente con `service_role` para insertar en `log_auditoria`. Llamada desde todas las server actions del admin que modifican estado.

**Steps:**
1. Implementar.
2. Refactor: actualizar las actions previas para usar este helper.
3. Commit: `feat: helper auditoría`

**Checkpoint:** ✅ Admin panel completo.

---

## Fase 9 — Pulido, Mobile y Deploy a Producción

**Objetivo:** App lista para invitar a los participantes.

### Task 9.1: Mobile responsive QA

**Steps:**
1. Probar todas las pantallas en viewport 375px (iPhone SE).
2. Ajustar cualquier layout que se rompa.
3. Verificar que MobileNav funcione bien.
4. Commit: `style: mobile fixes`

### Task 9.2: Estados vacíos y de carga

**Steps:**
1. Cada lista tiene un "no hay X" amigable.
2. Skeletons mientras carga.
3. Toasts de éxito/error en acciones.
4. Commit: `feat: empty states y loading`

### Task 9.3: Manejo de errores y validación de inputs

**Steps:**
1. Inputs numéricos con `min=0`, `max=20`.
2. Server actions devuelven errores legibles.
3. Mostrar el error al usuario sin trabar la app.
4. Commit: `feat: validación y errores`

### Task 9.4: Setup Supabase producción

**Steps:**
1. Aplicar todas las migraciones a `quiniela-prod`: `supabase link --project-ref <prod-ref>` + `supabase db push`.
2. Configurar Google OAuth en `quiniela-prod` (Client ID/Secret + redirect URI).
3. En Vercel: variables de entorno de producción apuntando a `quiniela-prod`.
4. Promoverte a admin en prod: `UPDATE usuarios SET es_admin = true WHERE email = 'juanpa6@gmail.com';` (después de tu primer login).

### Task 9.5: Importar fixture en producción

**Steps:**
1. Login a producción.
2. Admin → Partidos → "Importar fixture".
3. Verificar que aparecen los 48 partidos de grupos.

### Task 9.6: Smoke test end-to-end en producción

**Steps:**
1. Crear segundo usuario de prueba con otra cuenta Google.
2. Predecir un partido.
3. Como admin, setear resultado real.
4. Verificar que se calculan puntos y aparece en leaderboard.
5. Revertir el resultado a null para no contaminar.

### Task 9.7: Invitar a los participantes

**Steps:**
1. Mandar link de la app por WhatsApp con instrucciones cortas.
2. Vigilar logs por 24h para detectar errores.

**Checkpoint:** ✅ Quiniela live.

---

## Fase 10 — Operación durante el Mundial

**Objetivo:** Mantenimiento durante el evento.

### Tareas recurrentes (admin)

1. **Cada día de partidos:**
   - Verificar que el cron sincronizó bien (Vercel logs).
   - Si algún resultado está mal, corregir desde admin.
   - Agregar preguntas bonus si querés.

2. **Al terminar cada fase:**
   - Importar nuevos partidos via API (botón).
   - Habilitar los partidos.
   - Avisar al grupo de WhatsApp.

3. **Al terminar el Mundial:**
   - Setear `goleador_oficial`.
   - Llamar "cerrar torneo" desde admin.
   - Anunciar campeón de la quiniela.

---

## Apéndice: Estructura de archivos final esperada

```
quiniela-mundial/
├── app/
│   ├── (app)/                  # Route group autenticado
│   │   ├── layout.tsx          # Shell con nav
│   │   ├── page.tsx            # Home/Dashboard
│   │   ├── partidos/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       └── FormularioPrediccion.tsx
│   │   ├── tabla/page.tsx
│   │   ├── mi-quiniela/page.tsx
│   │   ├── perfil/page.tsx
│   │   └── admin/
│   │       ├── layout.tsx
│   │       ├── page.tsx
│   │       ├── configuracion/page.tsx
│   │       ├── partidos/page.tsx
│   │       ├── predicciones/page.tsx
│   │       ├── ajustes/page.tsx
│   │       └── auditoria/page.tsx
│   ├── login/page.tsx
│   ├── auth/callback/route.ts
│   ├── api/
│   │   ├── admin/...
│   │   └── cron/sync-results/route.ts
│   └── layout.tsx
├── components/
│   ├── ui/                     # shadcn
│   ├── Header.tsx
│   ├── MobileNav.tsx
│   ├── BanderaEquipo.tsx
│   ├── ProximoPartido.tsx
│   ├── MiniLeaderboard.tsx
│   └── admin/
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   ├── football-api/
│   │   ├── client.ts
│   │   ├── types.ts
│   │   ├── import-fixture.ts
│   │   └── sync-results.ts
│   ├── queries/
│   ├── actions/
│   ├── dates.ts
│   ├── audit.ts
│   └── database.types.ts
├── supabase/
│   ├── config.toml
│   └── migrations/
│       └── *.sql
├── middleware.ts
├── vercel.json
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── .env.example
```

---

## Resumen ejecutivo

| Fase | Resultado | Tiempo estimado |
|---|---|---|
| 0 | App online con login Google | 1-2 días |
| 1 | Schema BD completo | 1 día |
| 2 | RLS aplicado | 1 día |
| 3 | API + cron + import fixture | 1 día |
| 4 | Predicciones básicas (MVP usable) | 2 días |
| 5 | Cálculo de puntos + tabla realtime | 1-2 días |
| 6 | Preguntas bonus | 1 día |
| 7 | Predicciones de torneo | 1 día |
| 8 | Panel admin completo | 2-3 días |
| 9 | Pulido + deploy producción | 1-2 días |

**Total estimado: 12-15 días de trabajo enfocado.**
