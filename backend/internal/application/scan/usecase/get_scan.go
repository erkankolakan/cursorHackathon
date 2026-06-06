package usecase

import (
	"context"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/application/scan/dto"
	"github.com/masterfabric-go/masterfabric/internal/domain/scan/repository"
)

// GetScanUseCase fetches a single scan by ID.
type GetScanUseCase struct {
	scanRepo repository.ScanRepository
}

// NewGetScanUseCase creates a new GetScanUseCase.
func NewGetScanUseCase(scanRepo repository.ScanRepository) *GetScanUseCase {
	return &GetScanUseCase{scanRepo: scanRepo}
}

// Execute returns a single scan DTO.
func (uc *GetScanUseCase) Execute(ctx context.Context, id uuid.UUID) (*dto.ScanResponse, error) {
	scan, err := uc.scanRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	resp := dto.ToResponse(scan)
	return &resp, nil
}
