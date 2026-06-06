package usecase

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/application/scan/dto"
	"github.com/masterfabric-go/masterfabric/internal/domain/scan/model"
	"github.com/masterfabric-go/masterfabric/internal/domain/scan/repository"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
)

// CreateScanUseCase orchestrates creating a scan job and dispatching it to the AI service.
type CreateScanUseCase struct {
	scanRepo     repository.ScanRepository
	aiServiceURL string
	httpClient   *http.Client
}

// NewCreateScanUseCase creates a new CreateScanUseCase.
func NewCreateScanUseCase(scanRepo repository.ScanRepository, aiServiceURL string) *CreateScanUseCase {
	return &CreateScanUseCase{
		scanRepo:     scanRepo,
		aiServiceURL: aiServiceURL,
		httpClient:   &http.Client{Timeout: 120 * time.Second},
	}
}

type aiAnalyzeRequest struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

// Execute creates a pending scan record, calls the AI service, and persists the result.
func (uc *CreateScanUseCase) Execute(ctx context.Context, orgID uuid.UUID, userID uuid.UUID, req dto.CreateScanRequest) (*dto.ScanResponse, error) {
	scan := &model.Scan{
		OrganizationID: orgID,
		District:       req.District,
		City:           req.City,
		Latitude:       req.Latitude,
		Longitude:      req.Longitude,
		Status:         model.ScanStatusPending,
		RequestedBy:    userID,
	}

	if err := uc.scanRepo.Create(ctx, scan); err != nil {
		return nil, err
	}

	scan.Status = model.ScanStatusProcessing
	_ = uc.scanRepo.Update(ctx, scan)

	result, err := uc.callAIService(ctx, req.Latitude, req.Longitude)
	if err != nil {
		scan.Status = model.ScanStatusFailed
		scan.ErrorMessage = err.Error()
		_ = uc.scanRepo.Update(ctx, scan)
		return nil, domainErr.New(domainErr.ErrInternal, "AI service analysis failed", err)
	}

	if result.Error != "" {
		scan.Status = model.ScanStatusFailed
		scan.ErrorMessage = result.Error
		_ = uc.scanRepo.Update(ctx, scan)
		return nil, domainErr.New(domainErr.ErrInternal, result.Error, nil)
	}

	now := time.Now().UTC()
	scan.Status = model.ScanStatusCompleted
	scan.AccessibilityScore = result.AccessibilityScore
	scan.Issues = result.Issues
	scan.StreetViewURL = result.StreetViewURL
	scan.AnonymizedImageURL = result.AnonymizedImageURL
	scan.CompletedAt = &now

	if err := uc.scanRepo.Update(ctx, scan); err != nil {
		return nil, err
	}

	resp := dto.ToResponse(scan)
	return &resp, nil
}

func (uc *CreateScanUseCase) callAIService(ctx context.Context, lat, lng float64) (*dto.AIAnalysisResult, error) {
	payload, _ := json.Marshal(aiAnalyzeRequest{Latitude: lat, Longitude: lng})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, fmt.Sprintf("%s/analyze", uc.aiServiceURL), bytes.NewReader(payload))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := uc.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result dto.AIAnalysisResult
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to parse AI service response: %w", err)
	}
	return &result, nil
}
