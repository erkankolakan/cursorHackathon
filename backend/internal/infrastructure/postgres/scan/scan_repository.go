package scan

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/masterfabric-go/masterfabric/internal/domain/scan/model"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
)

// ScanRepo implements repository.ScanRepository using PostgreSQL.
type ScanRepo struct {
	db *pgxpool.Pool
}

// NewScanRepo creates a new ScanRepo.
func NewScanRepo(db *pgxpool.Pool) *ScanRepo {
	return &ScanRepo{db: db}
}

func (r *ScanRepo) Create(ctx context.Context, s *model.Scan) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	now := time.Now().UTC()
	s.CreatedAt = now
	s.UpdatedAt = now

	issuesJSON, _ := json.Marshal(s.Issues)

	_, err := r.db.Exec(ctx,
		`INSERT INTO scans
		 (id, organization_id, district, city, latitude, longitude, status,
		  accessibility_score, issues, street_view_url, anonymized_image_url,
		  error_message, requested_by, created_at, updated_at, completed_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
		s.ID, s.OrganizationID, s.District, s.City, s.Latitude, s.Longitude, s.Status,
		s.AccessibilityScore, issuesJSON, s.StreetViewURL, s.AnonymizedImageURL,
		s.ErrorMessage, s.RequestedBy, s.CreatedAt, s.UpdatedAt, s.CompletedAt,
	)
	if err != nil {
		return domainErr.New(domainErr.ErrInternal, "failed to create scan", err)
	}
	return nil
}

func (r *ScanRepo) GetByID(ctx context.Context, id uuid.UUID) (*model.Scan, error) {
	s, err := r.scanRow(ctx,
		`SELECT id, organization_id, district, city, latitude, longitude, status,
		        accessibility_score, issues, street_view_url, anonymized_image_url,
		        error_message, requested_by, created_at, updated_at, completed_at
		 FROM scans WHERE id=$1`, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainErr.New(domainErr.ErrNotFound, "scan not found", nil)
		}
		return nil, domainErr.New(domainErr.ErrInternal, "failed to get scan", err)
	}
	return s, nil
}

func (r *ScanRepo) ListByOrg(ctx context.Context, orgID uuid.UUID, offset, limit int) ([]*model.Scan, int, error) {
	var total int
	if err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM scans WHERE organization_id=$1`, orgID).Scan(&total); err != nil {
		return nil, 0, domainErr.New(domainErr.ErrInternal, "failed to count scans", err)
	}

	rows, err := r.db.Query(ctx,
		`SELECT id, organization_id, district, city, latitude, longitude, status,
		        accessibility_score, issues, street_view_url, anonymized_image_url,
		        error_message, requested_by, created_at, updated_at, completed_at
		 FROM scans WHERE organization_id=$1
		 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
		orgID, limit, offset,
	)
	if err != nil {
		return nil, 0, domainErr.New(domainErr.ErrInternal, "failed to list scans", err)
	}
	defer rows.Close()

	var scans []*model.Scan
	for rows.Next() {
		s, err := r.scanRowFromRows(rows)
		if err != nil {
			return nil, 0, domainErr.New(domainErr.ErrInternal, "failed to scan row", err)
		}
		scans = append(scans, s)
	}
	return scans, total, nil
}

func (r *ScanRepo) Update(ctx context.Context, s *model.Scan) error {
	s.UpdatedAt = time.Now().UTC()
	issuesJSON, _ := json.Marshal(s.Issues)

	_, err := r.db.Exec(ctx,
		`UPDATE scans SET
		  status=$1, accessibility_score=$2, issues=$3, street_view_url=$4,
		  anonymized_image_url=$5, error_message=$6, updated_at=$7, completed_at=$8
		 WHERE id=$9`,
		s.Status, s.AccessibilityScore, issuesJSON, s.StreetViewURL,
		s.AnonymizedImageURL, s.ErrorMessage, s.UpdatedAt, s.CompletedAt, s.ID,
	)
	if err != nil {
		return domainErr.New(domainErr.ErrInternal, "failed to update scan", err)
	}
	return nil
}

func (r *ScanRepo) scanRow(ctx context.Context, query string, args ...interface{}) (*model.Scan, error) {
	row := r.db.QueryRow(ctx, query, args...)
	return r.scanRowFromRow(row)
}

func (r *ScanRepo) scanRowFromRow(row pgx.Row) (*model.Scan, error) {
	var s model.Scan
	var issuesJSON []byte
	if err := row.Scan(
		&s.ID, &s.OrganizationID, &s.District, &s.City, &s.Latitude, &s.Longitude, &s.Status,
		&s.AccessibilityScore, &issuesJSON, &s.StreetViewURL, &s.AnonymizedImageURL,
		&s.ErrorMessage, &s.RequestedBy, &s.CreatedAt, &s.UpdatedAt, &s.CompletedAt,
	); err != nil {
		return nil, err
	}
	if len(issuesJSON) > 0 {
		_ = json.Unmarshal(issuesJSON, &s.Issues)
	}
	return &s, nil
}

func (r *ScanRepo) scanRowFromRows(rows pgx.Rows) (*model.Scan, error) {
	var s model.Scan
	var issuesJSON []byte
	if err := rows.Scan(
		&s.ID, &s.OrganizationID, &s.District, &s.City, &s.Latitude, &s.Longitude, &s.Status,
		&s.AccessibilityScore, &issuesJSON, &s.StreetViewURL, &s.AnonymizedImageURL,
		&s.ErrorMessage, &s.RequestedBy, &s.CreatedAt, &s.UpdatedAt, &s.CompletedAt,
	); err != nil {
		return nil, err
	}
	if len(issuesJSON) > 0 {
		_ = json.Unmarshal(issuesJSON, &s.Issues)
	}
	return &s, nil
}
