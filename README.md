# Prode Clausura 2026

PWA para predecir los resultados del **Torneo Clausura 2026** de la Liga Profesional argentina. Los usuarios predicen el marcador de cada partido antes de que empiece y suman puntos según la precisión de su predicción.

## Demo

`https://<usuario>.github.io/Prode/`

## Features

- Predicción de marcadores para todos los partidos del Clausura (fase regular por zonas y playoffs)
- Sistema de puntos automático calculado al finalizar cada partido
- Tabla de posiciones en tiempo real con tu posición destacada
- Filtro de partidos por fase (Zonas / Octavos / Cuartos / Semis / Final)
- Infinite scroll con skeleton loader
- Escudos de los clubes en cada partido
- Indicador de cierre de predicciones (cuando el partido arranca en menos de 24hs)
- Historial de predicciones del usuario con resultados
- Cambio de contraseña desde el perfil
- PWA instalable (funciona en móvil como app nativa)
- Actualización automática de resultados via cron (frecuencia ajustada al plan gratuito de la API)

## Formato del torneo

El Clausura 2026 tiene **30 equipos** divididos en **2 zonas de 15** (Zona A y Zona B). Fase regular a una rueda dentro de cada zona más partidos interzonales; los 8 mejores de cada zona clasifican a los playoffs (**octavos → cuartos → semis → final**), a partido único.

En el modelo de datos, la fase regular se guarda como `stage='group'` con `group_name` `'A'`/`'B'`, y los playoffs como `round_of_16` / `quarter` / `semi` / `final`.

## Torneos (multi-torneo)

La app soporta **varios torneos** en la misma base sin borrar el historial (tabla `tournaments`, y `matches.tournament_id`). Cada partido pertenece a un torneo y la app muestra **solo el torneo activo** (`tournaments.is_active = true`, uno a la vez).

De fábrica quedan sembrados dos:

| id | Torneo | Estado | Fuente de datos |
| --- | --- | --- | --- |
| 1 | Mundial 2026 | histórico (inactivo) | — (se conserva como historial) |
| 2 | Torneo Clausura 2026 | **activo** | TheSportsDB (league 4406) |

Para cambiar de torneo activo, se marca `is_active` en la tabla `tournaments` (no hace falta redeploy ni borrar datos). Cada torneo define su `group_label` (`'Grupo'` para el Mundial, `'Zona'` para el Clausura), que la UI usa para los labels; los tabs de fases se adaptan solos a las fases que ese torneo tiene.

## Stack

| Capa | Tecnología |
| --- | --- |
| Frontend | Vite + Vue 3 + TypeScript + Tailwind CSS v4 |
| Auth | Supabase Auth (email/password) |
| Base de datos | Supabase PostgreSQL + RLS |
| Tiempo real | Supabase Realtime |
| Resultados | Edge Function + pg_cron + TheSportsDB |
| Deploy | GitHub Pages + GitHub Actions |

## Sistema de puntos

| Predicción | Puntos |
| --- | --- |
| Marcador exacto (incluyendo tiempo extra) | 3 pts |
| Ganador o empate correcto | 1 pt |
| Incorrecto | 0 pts |

En partidos que van a tiempo extra (playoffs), el puntaje se calcula sobre el resultado al final de los 120 minutos. El ganador en penales no afecta los puntos.

## Setup local

### Requisitos

- Node.js 20+
- Cuenta en [Supabase](https://supabase.com) con un proyecto creado
- API key de [TheSportsDB](https://www.thesportsdb.com) (plan gratuito; para probar sirve la key de test `3`)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (solo para deploy de Edge Functions)

### Pasos

1. Clonar el repo e instalar dependencias:

   ```bash
   git clone https://github.com/<usuario>/Prode.git
   cd Prode
   npm install
   ```

2. Copiar y completar las variables de entorno:

   ```bash
   cp .env.local.example .env.local
   ```

   | Variable | Dónde obtenerla |
   | --- | --- |
   | `VITE_SUPABASE_URL` | Supabase Dashboard → Project Settings → API |
   | `VITE_SUPABASE_ANON_KEY` | Supabase Dashboard → Project Settings → API |

3. Aplicar las migraciones en Supabase Dashboard → SQL Editor (copiar el contenido de `supabase/migrations/*.sql` en orden) o con el CLI:

   ```bash
   supabase db push
   ```

4. Levantar el servidor de desarrollo:

   ```bash
   npm run dev
   ```

## Deploy en GitHub Pages

El proyecto se despliega automáticamente en cada push a `main` via GitHub Actions.

### Configuración inicial (una sola vez)

1. En el repo de GitHub: **Settings → Pages → Source: GitHub Actions**

2. Agregar los secrets en **Settings → Secrets and variables → Actions**:

   | Secret | Valor |
   | --- | --- |
   | `VITE_SUPABASE_URL` | URL de tu proyecto Supabase |
   | `VITE_SUPABASE_ANON_KEY` | Anon key de tu proyecto Supabase |

3. Hacer push a `main`. El workflow construye y despliega automáticamente.

## Edge Function (actualización de resultados)

La función `update-results` consulta [TheSportsDB](https://www.thesportsdb.com) (liga `4406`, Primera División argentina) y sincroniza los partidos del torneo **activo** en la base. Toma la liga, la temporada y el filtro de fecha del torneo marcado `is_active` en la tabla `tournaments`, y por cada partido guarda marcador, estado y **escudos** de los clubes. Las **zonas** (A/B) las arma desde la tabla de posiciones (`lookuptable`, campo `strGroup`). Se ejecuta automáticamente via pg_cron.

> **API key:** la key de test `3` devuelve datos reales pero puede venir limitada. Para producción, sacá una key gratuita propia en TheSportsDB y ponela en el secret `THESPORTSDB_KEY`.
>
> **Distinción Apertura/Clausura:** TheSportsDB no etiqueta los partidos por torneo, así que el Clausura se aísla por fecha (`tournaments.starts_on`); los partidos anteriores (Apertura) se descartan.
>
> **Frecuencia del cron:** cada corrida hace hasta 4 requests (próximos + pasados + temporada + tabla). TheSportsDB limita por minuto (no un cupo diario chico), así que **cada 30 minutos** (`*/30 * * * *`) va sobrado.

### 1. Configurar secrets en Supabase

```bash
# Generar un secreto aleatorio
openssl rand -hex 32

supabase secrets set THESPORTSDB_KEY=tu_key_de_thesportsdb   # o 3 para probar
supabase secrets set CRON_SECRET=el_secreto_generado_arriba
```

### 2. Desplegar la función

```bash
supabase functions deploy update-results --no-verify-jwt
```

### 3. Configurar el cron job

En **Supabase Dashboard → SQL Editor**, eliminar el job anterior (si existe) y crear uno nuevo:

```sql
-- Eliminar job anterior si existe
SELECT cron.unschedule('update-match-results');

-- Crear job con el secret como header
SELECT cron.schedule(
  'update-match-results',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://<project-ref>.supabase.co/functions/v1/update-results',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'x-cron-secret', 'el_mismo_cron_secret_de_arriba'
    ),
    body    := '{}'::jsonb
  );
  $$
);
```

## Gestión de usuarios

Los usuarios se crean manualmente desde **Supabase Dashboard → Authentication → Users**. No hay registro público — el acceso es solo por invitación.

### Usuarios admin (panel de carga)

Un usuario admin ve la pestaña **⚙️ Admin** (`/admin`), donde puede cargar partidos (equipos, fecha/hora, fase, zona, escudos) y editar marcadores/estado. Al marcar un partido como *Finalizado* con su marcador, los puntos se calculan solos.

La condición de admin es el claim `role: "admin"` en el `app_metadata` del usuario. Solo se puede setear del lado del servidor (el usuario no puede auto-asignárselo) y viaja en el JWT, así que las políticas RLS lo validan (ver `supabase/migrations/006_admin_role_and_match_write.sql`).

**Para volver admin a un usuario**, en **Supabase Dashboard → SQL Editor**:

```sql
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'
WHERE email = 'tu-admin@ejemplo.com';
```

Para quitarle el admin:

```sql
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data - 'role'
WHERE email = 'tu-admin@ejemplo.com';
```

> Alternativa por UI: **Authentication → Users → (usuario) → Raw app meta data**, agregando `"role": "admin"`.
>
> **Importante:** el cambio impacta recién con un token nuevo. El usuario tiene que **cerrar sesión y volver a entrar** para que la app lo reconozca como admin.

## Estructura del proyecto

```text
src/
├── components/
│   ├── layout/       # AppHeader, AppNav
│   ├── leaderboard/  # LeaderboardTable
│   ├── matches/      # MatchCard, MatchCardSkeleton
│   └── ui/           # BaseToast
├── composables/      # useAuth, useMatches, useLeaderboard, useToast
├── pages/            # HomePage, MatchDetailPage, LeaderboardPage, ProfilePage, AdminPage
├── stores/           # auth, matches, predictions, leaderboard (Pinia)
├── utils/            # crests.ts (escudos de clubes), flags.ts (banderas del Mundial histórico)
└── types/            # index.ts

supabase/
├── functions/update-results/   # Edge Function (sincroniza resultados via TheSportsDB)
└── migrations/                 # Schema SQL
```
