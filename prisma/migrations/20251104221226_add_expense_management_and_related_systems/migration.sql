-- Baseline migration: Expense management, signatures, manual time entries, and PTO adjustments
-- These changes were previously applied using 'prisma db push' and are documented here for migration history.
-- This migration represents the state of the database after adding:
--   - Expense management system (expenses, expense_reports, expense_policies, etc.)
--   - Digital signature system (signature_requests, signable_documents, signers, etc.)
--   - Manual time entry requests (manual_time_entry_requests)
--   - PTO balance adjustments (pto_balance_adjustments, recurring_pto_adjustments)
--   - Organization PTO configuration (organization_pto_config)

-- No actual SQL operations needed as tables already exist in database
