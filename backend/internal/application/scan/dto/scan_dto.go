package dto

import (
	"time"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/domain/scan/model"
)

// CreateScanRequest is the payload for initiating a new scan job.
type CreateScanRequest struct {
	Neighbourhood string  `json:"neighbourhood,omitempty"`
	District      string  `json:"district" validate:"required,min=2"`
	City          string  `json:"city" validate:"required,min=2"`
	Latitude      float64 `json:"latitude" validate:"required"`
	Longitude     float64 `json:"longitude" validate:"required"`
}

// ScanResponse is the API representation of a Scan.
type ScanResponse struct {
	ID                 uuid.UUID                  `json:"id"`
	OrganizationID     uuid.UUID                  `json:"organization_id"`
	Neighbourhood      string                     `json:"neighbourhood,omitempty"`
	District           string                     `json:"district"`
	City               string                     `json:"city"`
	Latitude           float64                    `json:"latitude"`
	Longitude          float64                    `json:"longitude"`
	Status             string                     `json:"status"`
	AccessibilityScore int                        `json:"accessibility_score"`
	ComplianceLevel    string                     `json:"compliance_level"`
	Issues             []model.AccessibilityIssue `json:"issues"`
	StreetViewURL      string                     `json:"street_view_url,omitempty"`
	AnonymizedImageURL string                     `json:"anonymized_image_url,omitempty"`
	ErrorMessage       string                     `json:"error_message,omitempty"`
	RequestedBy        uuid.UUID                  `json:"requested_by"`
	CreatedAt          time.Time                  `json:"created_at"`
	CompletedAt        *time.Time                 `json:"completed_at,omitempty"`
}

// ToResponse converts a domain Scan model to a ScanResponse DTO.
func ToResponse(s *model.Scan) ScanResponse {
	return ScanResponse{
		ID:                 s.ID,
		OrganizationID:     s.OrganizationID,
		Neighbourhood:      s.Neighbourhood,
		District:           s.District,
		City:               s.City,
		Latitude:           s.Latitude,
		Longitude:          s.Longitude,
		Status:             string(s.Status),
		AccessibilityScore: s.AccessibilityScore,
		ComplianceLevel:    s.ComplianceLevel(),
		Issues:             s.Issues,
		StreetViewURL:      s.StreetViewURL,
		AnonymizedImageURL: s.AnonymizedImageURL,
		ErrorMessage:       s.ErrorMessage,
		RequestedBy:        s.RequestedBy,
		CreatedAt:          s.CreatedAt,
		CompletedAt:        s.CompletedAt,
	}
}

// AIAnalysisResult is the payload received back from the Python AI microservice.
type AIAnalysisResult struct {
	AccessibilityScore int                        `json:"accessibility_score"`
	Issues             []model.AccessibilityIssue `json:"issues"`
	StreetViewURL      string                     `json:"street_view_url"`
	AnonymizedImageURL string                     `json:"anonymized_image_url"`
	Error              string                     `json:"error,omitempty"`
}
