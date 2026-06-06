package usecase

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/textproto"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/application/scan/dto"
	"github.com/masterfabric-go/masterfabric/internal/domain/scan/model"
	"github.com/masterfabric-go/masterfabric/internal/domain/scan/repository"
)

const maxUploadBytes = 10 << 20 // 10 MB

// CreateUploadScanUseCase handles institution-uploaded photo analysis.
type CreateUploadScanUseCase struct {
	scanRepo     repository.ScanRepository
	aiServiceURL string
	httpClient   *http.Client
}

// NewCreateUploadScanUseCase creates a new CreateUploadScanUseCase.
func NewCreateUploadScanUseCase(scanRepo repository.ScanRepository, aiServiceURL string) *CreateUploadScanUseCase {
	return &CreateUploadScanUseCase{
		scanRepo:     scanRepo,
		aiServiceURL: aiServiceURL,
		httpClient:   &http.Client{Timeout: 120 * time.Second},
	}
}

// Execute creates a pending scan and processes the uploaded image asynchronously.
// Raw image bytes are never persisted — only forwarded to the AI service.
func (uc *CreateUploadScanUseCase) Execute(
	ctx context.Context,
	orgID uuid.UUID,
	userID uuid.UUID,
	req dto.CreateUploadScanRequest,
	imageBytes []byte,
	filename string,
) (*dto.ScanResponse, error) {
	if len(imageBytes) == 0 {
		return nil, fmt.Errorf("boş görüntü dosyası")
	}
	if len(imageBytes) > maxUploadBytes {
		return nil, fmt.Errorf("dosya boyutu 10 MB'ı aşamaz")
	}

	scan := &model.Scan{
		OrganizationID: orgID,
		Neighbourhood:  req.Neighbourhood,
		District:       req.District,
		City:           req.City,
		Latitude:       req.Latitude,
		Longitude:      req.Longitude,
		Source:         model.ScanSourceUpload,
		Status:         model.ScanStatusPending,
		RequestedBy:    userID,
	}

	if err := uc.scanRepo.Create(ctx, scan); err != nil {
		return nil, err
	}

	imgCopy := make([]byte, len(imageBytes))
	copy(imgCopy, imageBytes)

	go uc.processAsync(scan.ID, imgCopy, filename)

	resp := dto.ToResponse(scan)
	return &resp, nil
}

func (uc *CreateUploadScanUseCase) processAsync(scanID uuid.UUID, imageBytes []byte, filename string) {
	ctx, cancel := context.WithTimeout(context.Background(), 180*time.Second)
	defer cancel()

	scan, err := uc.scanRepo.GetByID(ctx, scanID)
	if err != nil {
		return
	}

	scan.Status = model.ScanStatusProcessing
	_ = uc.scanRepo.Update(ctx, scan)

	result, err := uc.callAIService(ctx, imageBytes, filename)
	if err != nil {
		scan.Status = model.ScanStatusFailed
		scan.ErrorMessage = err.Error()
		_ = uc.scanRepo.Update(ctx, scan)
		return
	}

	if result.Error != "" {
		scan.Status = model.ScanStatusFailed
		scan.ErrorMessage = result.Error
		_ = uc.scanRepo.Update(ctx, scan)
		return
	}

	now := time.Now().UTC()
	scan.Status = model.ScanStatusCompleted
	scan.AccessibilityScore = result.AccessibilityScore
	scan.Issues = result.Issues
	scan.AnonymizedImageURL = result.AnonymizedImageURL
	scan.CompletedAt = &now

	_ = uc.scanRepo.Update(ctx, scan)
}

func (uc *CreateUploadScanUseCase) callAIService(ctx context.Context, imageBytes []byte, filename string) (*dto.AIAnalysisResult, error) {
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	partHeader := make(textproto.MIMEHeader)
	partHeader.Set("Content-Disposition", fmt.Sprintf(`form-data; name="image"; filename="%s"`, filename))
	partHeader.Set("Content-Type", contentTypeFromFilename(filename))

	part, err := writer.CreatePart(partHeader)
	if err != nil {
		return nil, err
	}
	if _, err := io.Copy(part, bytes.NewReader(imageBytes)); err != nil {
		return nil, err
	}
	if err := writer.Close(); err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, fmt.Sprintf("%s/analyze/upload", uc.aiServiceURL), body)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", writer.FormDataContentType())

	resp, err := uc.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("AI servisi hata döndü (%d): %s", resp.StatusCode, string(respBody))
	}

	var result dto.AIAnalysisResult
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to parse AI service response: %w", err)
	}
	return &result, nil
}

func contentTypeFromFilename(filename string) string {
	lower := strings.ToLower(filename)
	switch {
	case strings.HasSuffix(lower, ".jpg"), strings.HasSuffix(lower, ".jpeg"):
		return "image/jpeg"
	case strings.HasSuffix(lower, ".png"):
		return "image/png"
	case strings.HasSuffix(lower, ".webp"):
		return "image/webp"
	default:
		return "application/octet-stream"
	}
}
