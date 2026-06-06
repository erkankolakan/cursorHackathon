-- +goose Up
ALTER TABLE scans
  ADD COLUMN IF NOT EXISTS neighbourhood TEXT NOT NULL DEFAULT '';

-- +goose Down
ALTER TABLE scans
  DROP COLUMN IF EXISTS neighbourhood;
