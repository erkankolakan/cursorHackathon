-- +goose Up
ALTER TABLE scans
    ADD COLUMN IF NOT EXISTS source VARCHAR(50) NOT NULL DEFAULT 'street_view';

-- +goose Down
ALTER TABLE scans
    DROP COLUMN IF EXISTS source;
