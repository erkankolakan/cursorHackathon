package usecase

import (
	"context"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/application/scan/dto"
	"github.com/masterfabric-go/masterfabric/internal/domain/scan/repository"
)

// ListScansUseCase retrieves paginated scans for an organisation.
type ListScansUseCase struct {
	scanRepo repository.ScanRepository
}

// NewListScansUseCase creates a new ListScansUseCase.
func NewListScansUseCase(scanRepo repository.ScanRepository) *ListScansUseCase {
	return &ListScansUseCase{scanRepo: scanRepo}
}

// Execute returns a list of scans and the total count.
func (uc *ListScansUseCase) Execute(ctx context.Context, orgID uuid.UUID, offset, limit int) ([]dto.ScanResponse, int, error) {
	scans, total, err := uc.scanRepo.ListByOrg(ctx, orgID, offset, limit)
	if err != nil {
		return nil, 0, err
	}

	var result []dto.ScanResponse
	for _, s := range scans {
		result = append(result, dto.ToResponse(s))
	}
	return result, total, nil
}
