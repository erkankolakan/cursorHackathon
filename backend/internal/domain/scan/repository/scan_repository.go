package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/domain/scan/model"
)

// ScanRepository defines the persistence contract for Scan aggregates.
type ScanRepository interface {
	Create(ctx context.Context, scan *model.Scan) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.Scan, error)
	ListByOrg(ctx context.Context, orgID uuid.UUID, offset, limit int) ([]*model.Scan, int, error)
	Update(ctx context.Context, scan *model.Scan) error
	GetOrgStats(ctx context.Context, orgID uuid.UUID) (*model.OrgStats, error)
}
