# Prode Mundial 2026

PWA para predecir los resultados del Mundial de Fútbol 2026. Los usuarios predicen el marcador de cada partido antes de que empiece y suman puntos según la precisión de su predicción.

## Demo

`https://<usuario>.github.io/Prode/`

## Features

- Predicción de marcadores para todos los partidos del Mundial (fase de grupos y eliminatorias)
- Sistema de puntos automático calculado al finalizar cada partido
- Tabla de posiciones en tiempo real
- Filtro de partidos por fase (Grupos / Octavos / Cuartos / Semis / Final)
- Infinite scroll con skeleton loader
- Banderas de los países en cada partido
- Indicador de cierre de predicciones (cuando el partido arranca en menos de 24hs)
- Historial de predicciones del usuario con resultados
- PWA instalable (funciona en móvil como app nativa)
- Actualización automática de resultados cada 5 minutos

## Stack

| Capa | Tecnología |
| --- | --- |
| Frontend | Vite + Vue 3 + TypeScript + Tailwind CSS v4 |
| Auth | Supabase Auth (email/password) |
| Base de datos | Supabase PostgreSQL + RLS |
| Tiempo real | Supabase Realtime |
| Resultados | Edge Function + pg_cron + football-data.org |
| Deploy | GitHub Pages + GitHub Actions |

## Sistema de puntos

| Predicción | Puntos |
| --- | --- |
| Marcador exacto (incluyendo tiempo extra) | 3 pts |
| Ganador o empate correcto | 1 pt |
| Incorrecto | 0 pts |

En partidos que van a tiempo extra, el puntaje se calcula sobre el resultado al final de los 120 minutos. El ganador en penales no afecta los puntos.

## Setup local

### Requisitos

- Node.js 20+
- Cuenta en [Supabase](https://supabase.com) con un proyecto creado
- Token de [football-data.org](https://www.football-data.org) (plan gratuito)

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

3. Aplicar las migraciones en Supabase Dashboard → SQL Editor (copiar el contenido de `supabase/migrations/001_initial_schema.sql`) o con el CLI:

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

La función `update-results` consulta la API de football-data.org y sincroniza todos los partidos del Mundial en la base de datos. Se ejecuta automáticamente cada 5 minutos via pg_cron.

### Deploy

```bash
supabase functions deploy update-results
```

### Secrets necesarios en Supabase

```bash
supabase secrets set FOOTBALL_API_KEY=tu_token
```

## Gestión de usuarios

Los usuarios se crean manualmente desde **Supabase Dashboard → Authentication → Users**. No hay registro público — el acceso es solo por invitación.

## Estructura del proyecto

```text
src/
├── components/
│   ├── layout/       # AppHeader, AppNav
│   ├── leaderboard/  # LeaderboardTable
│   ├── matches/      # MatchCard, MatchCardSkeleton
│   └── ui/           # BaseToast
├── composables/      # useAuth, useMatches, useLeaderboard, useToast
├── pages/            # HomePage, MatchDetailPage, LeaderboardPage, ProfilePage
├── stores/           # auth, matches, predictions, leaderboard (Pinia)
├── utils/            # flags.ts (mapa de países → banderas)
└── types/            # index.ts

supabase/
├── functions/update-results/   # Edge Function
└── migrations/                 # Schema SQL
```
