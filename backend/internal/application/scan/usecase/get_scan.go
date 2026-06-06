package usecase

import (
	"context"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/application/scan/dto"
	"github.com/masterfabric-go/masterfabric/internal/domain/scan/repository"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
)

// GetScanUseCase fetches a single scan by ID.
type GetScanUseCase struct {
	scanRepo repository.ScanRepository
}

// NewGetScanUseCase creates a new GetScanUseCase.
func NewGetScanUseCase(scanRepo repository.ScanRepository) *GetScanUseCase {
	return &GetScanUseCase{scanRepo: scanRepo}
}

// Execute returns a single scan DTO, enforcing organization ownership.
func (uc *GetScanUseCase) Execute(ctx context.Context, id uuid.UUID, orgID uuid.UUID) (*dto.ScanResponse, error) {
	scan, err := uc.scanRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if orgID != uuid.Nil && scan.OrganizationID != orgID {
		return nil, domainErr.New(domainErr.ErrNotFound, "scan not found", nil)
	}
	resp := dto.ToResponse(scan)
	return &resp, nil
}
