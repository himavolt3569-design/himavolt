-- Migration: Enable RLS on audit_logs
-- All writes happen server-side via Prisma (service role) — RLS is bypassed there.
-- This only controls direct Supabase client / PostgREST access.

-- 1. Enable RLS — deny all client access by default until policies are defined.
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 2. Strip any broad grants inherited from PUBLIC.
REVOKE ALL ON public.audit_logs FROM PUBLIC, anon, authenticated;

-- 3. Grant SELECT to authenticated so the policy below can evaluate.
GRANT SELECT ON public.audit_logs TO authenticated;

-- 4. Allow only ADMIN users (role stored in public.users) to read all audit logs.
--    MasterAdmin check: looks up the caller's row in users by Supabase auth.uid().
CREATE POLICY "Admins can read all audit logs"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE id   = auth.uid()::text
        AND role = 'ADMIN'
    )
  );

-- 5. Indexes for the camelCase columns Prisma created.
--    (Prisma preserves case, so quote identifiers.)
CREATE INDEX IF NOT EXISTS idx_audit_logs_userId       ON public.audit_logs ("userId");
CREATE INDEX IF NOT EXISTS idx_audit_logs_restaurantId ON public.audit_logs ("restaurantId");
