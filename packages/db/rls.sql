-- ============================================================
-- Optional Row-Level Security (defense in depth) for Cash Pro.
--
-- The application already scopes every query by company_id (and tests
-- enforce tenant isolation). RLS adds a database-level guarantee so a
-- forgotten WHERE can never leak across tenants.
--
-- HOW TO ENABLE (production hardening):
--   1. Connect the app with a NON-owner role (table owners bypass RLS):
--        CREATE ROLE cashpro_app LOGIN PASSWORD '...';
--        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO cashpro_app;
--      and point DATABASE_URL at that role.
--   2. Run this script (as owner) to enable RLS + policies.
--   3. Ensure every request sets the tenant GUC inside its transaction:
--        SELECT set_config('app.current_company', '<company-uuid>', true);
--      (run as the first statement of a per-request transaction).
--
-- Policy: a row is visible/writable only when its company_id equals the
-- session GUC app.current_company.
-- ============================================================

DO $$
DECLARE
  t text;
  tenant_tables text[] := ARRAY[
    'categories','products','customers','suppliers',
    'invoices','invoice_items','payments',
    'purchase_orders','purchase_order_items','supplier_payments',
    'expenses','inventory_movements','transactions_log','settings',
    'company_users'
  ];
BEGIN
  FOREACH t IN ARRAY tenant_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', t);
    EXECUTE format($f$
      DROP POLICY IF EXISTS tenant_isolation ON %I;
      CREATE POLICY tenant_isolation ON %I
        USING (company_id = current_setting('app.current_company', true)::uuid)
        WITH CHECK (company_id = current_setting('app.current_company', true)::uuid);
    $f$, t, t);
  END LOOP;
END $$;
