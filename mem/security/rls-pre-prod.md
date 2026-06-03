# RLS — Pre-Production Security Notes

## Tables with Relaxed RLS in Dev

The following tables have relaxed RLS policies in the current dev environment to facilitate rapid development:

| Table | Relaxation | Reason |
|-------|-----------|--------|
| `profiles` | SELECT: all authenticated users | Needed for corretores listing, duty assignment |
| `duty_shifts` | INSERT/UPDATE: all authenticated | Duty schedule management |
| `duty_pdf_uploads` | INSERT: all authenticated | PDF upload workflow |
| `duty_schedule_batches` | INSERT/SELECT: all authenticated | Batch tracking |
| `app_settings` | SELECT/UPDATE: all authenticated | Settings page |
| `app_settings_kv` | SELECT/UPDATE: all authenticated | Cron config, flags |
| `user_roles` | SELECT/INSERT: all authenticated | Role management page |
| `notifications` | SELECT: own user only | Notification inbox |
| `contact_attempts` | INSERT/SELECT: all authenticated | Lead contact logging |
| `lead_history` | INSERT/SELECT: all authenticated | Lead audit trail |

## B3 — Role Escalation (Intentional in Dev)

**Behavior**: Any authenticated user can promote any other user (including themselves) to admin role via the Configurações page.

**Why intentional**: During development, we need to bootstrap admin users and test different role combinations without a chicken-and-egg problem.

**TODO for production**:
- Restrict role changes to admin-only via RLS policy on `user_roles`
- Add server-side validation in `handleRoleChange` to check current user is admin
- Consider adding approval workflow for admin promotions

## Production Hardening Checklist

- [ ] Enable strict RLS on `user_roles` — only admins can update roles
- [ ] Restrict `app_settings` to admin-only write access
- [ ] Add rate limiting on cron endpoint
- [ ] Rotate `cron_secret` after going live
- [ ] Restrict `profiles` updates to own profile only
- [ ] Enable Supabase Auth email confirmation
- [ ] Review all `createAdminClient()` usages — ensure they're only called server-side
