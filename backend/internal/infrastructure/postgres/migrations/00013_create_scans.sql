-- 00013_create_scans.sql
-- KentScan: erişilebilirlik tarama sonuçları tablosu

CREATE TABLE IF NOT EXISTS scans (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    district             VARCHAR(255) NOT NULL,
    city                 VARCHAR(255) NOT NULL,
    latitude             DOUBLE PRECISION NOT NULL,
    longitude            DOUBLE PRECISION NOT NULL,
    status               VARCHAR(50) NOT NULL DEFAULT 'pending',
    accessibility_score  INTEGER NOT NULL DEFAULT 0,
    issues               JSONB NOT NULL DEFAULT '[]',
    street_view_url      TEXT,
    anonymized_image_url TEXT,
    error_message        TEXT,
    requested_by         UUID NOT NULL REFERENCES users(id),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_scans_organization_id ON scans(organization_id);
CREATE INDEX IF NOT EXISTS idx_scans_status ON scans(status);
CREATE INDEX IF NOT EXISTS idx_scans_created_at ON scans(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scans_district ON scans(district);
