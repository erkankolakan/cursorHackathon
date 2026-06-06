package usecase

import (
	"context"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/domain/scan/model"
	"github.com/masterfabric-go/masterfabric/internal/domain/scan/repository"
)

// GetStatsUseCase aggregates scan statistics for an organisation.
type GetStatsUseCase struct {
	scanRepo repository.ScanRepository
}

// NewGetStatsUseCase creates a new GetStatsUseCase.
func NewGetStatsUseCase(scanRepo repository.ScanRepository) *GetStatsUseCase {
	return &GetStatsUseCase{scanRepo: scanRepo}
}

// Execute returns aggregated stats for the given organisation.
func (uc *GetStatsUseCase) Execute(ctx context.Context, orgID uuid.UUID) (*model.OrgStats, error) {
	return uc.scanRepo.GetOrgStats(ctx, orgID)
}
