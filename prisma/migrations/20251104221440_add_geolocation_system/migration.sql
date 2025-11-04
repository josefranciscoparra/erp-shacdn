-- Baseline migration: Geolocation system for time tracking
-- These changes were previously applied using 'prisma db push' and are documented here for migration history.
-- This migration represents the state of the database after adding geolocation features:
--   - Organization geolocation configuration (geolocationEnabled, geolocationRequired, etc.)
--   - TimeEntry GPS fields (latitude, longitude, accuracy, isWithinAllowedArea, etc.)
--   - CostCenter location fields (latitude, longitude, allowedRadiusMeters)
--   - GeolocationConsent table for GDPR compliance

-- No actual SQL operations needed as columns and tables already exist in database
