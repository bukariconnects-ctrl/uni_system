-- ============================================================
-- Migration: Drop v_super_admin_platform_stats view
--
-- Why: This view aggregates ALL student, faculty, course,
-- department, major, enrollment, and attendance data across
-- EVERY tenant in the platform. This violates data isolation
-- principles and poses a security/privacy risk — a Super Admin
-- (platform manager) should only see tenant-level data, not
-- granular educational data.
--
-- The Super Admin reports page now uses only:
--   v_super_admin_tenants_overview  — tenant counts & storage
--   v_super_admin_token_usage       — AI token consumption
--   v_super_admin_monthly_growth    — tenant growth over time
--   tenants table                   — basic tenant list
-- ============================================================

DROP VIEW IF EXISTS v_super_admin_platform_stats;

DO $$
BEGIN
  RAISE NOTICE 'Dropped v_super_admin_platform_stats view — super admin no longer has access to cross-tenant educational data';
END $$;
