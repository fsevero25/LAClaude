# LACrm — Dev Rules & Project Memory

## Stack
- React 19 + TanStack Start v1 (file-based routing `src/routes/`)
- Tailwind v4 via `@tailwindcss/vite`
- Supabase: `sctpvruahcztbqhmauev.supabase.co`
- AI: `google/gemini-2.5-flash` via `LOVABLE_API_KEY` → `https://api.lovable.app/openai/v1/chat/completions`
- Server functions via TanStack `createServerFn`

## File Routing Conventions
- `src/routes/__root.tsx` — root HTML wrapper, AuthProvider, Toaster
- `src/routes/index.tsx` — login page
- `src/routes/_app.tsx` — authenticated layout with AppLayout
- `src/routes/_app.<page>.tsx` — app pages (pipeline, plantoes, relatorios, corretores, configuracoes)
- `src/routes/api/public/hooks/*.ts` — public API endpoints

## Key Bug Fixes Applied
- **B1**: `timeLimitHours` for `primeira_chamada`, `segunda_chamada`, `terceira_chamada` = 24 (NOT 0.25)
- **B2**: Cron endpoint validates `x-cron-secret` against `app_settings_kv` DB value
- **P3**: Vista sync only runs when `vista_sync_enabled = "true"` in `app_settings_kv`

## Security Notes (see mem/security/)
- B3: Role escalation in `/configuracoes` is intentional in dev — any authenticated user can promote to admin

## Features Implemented
- **8.1**: Duty PDF parser — two names create 2 separate records (slot A + B), never concatenated
- **8.2**: After confirming gestao shifts, upserts `team_managers` (team, weekday, corretor_id)
- **8.3**: Unmapped corretores in PDF parse are skipped (amber UI, manual select) — no ghost creation

## Design System
- Dark theme: `--background: #0d0d0d`, `--surface: #141414`, `--sidebar: #0a0a0a`
- Accent: `#c8a96e` (gold-ish), Teams: `--team-pb: #ca8a04`, `--team-fln: #16a34a`
- LA monogram: silver/gray (`#c8c8c8`), no yellow/gold
- No Tailwind classes in components — use inline `style={{}}` for consistency with CSS vars

## Supabase Tables
profiles, user_roles, leads, lead_history, lead_sources, contact_attempts,
duty_shifts, duty_pdf_uploads, duty_schedule_batches, corretor_unavailability,
team_managers, app_settings, app_settings_kv, notifications, report_snapshots
