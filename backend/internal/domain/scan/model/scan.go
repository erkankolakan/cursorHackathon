package model

import (
	"time"

	"github.com/google/uuid"
)

// ScanStatus represents the lifecycle state of a scan job.
type ScanStatus string

const (
	ScanStatusPending    ScanStatus = "pending"
	ScanStatusProcessing ScanStatus = "processing"
	ScanStatusCompleted  ScanStatus = "completed"
	ScanStatusFailed     ScanStatus = "failed"
)

// IssueType classifies detected accessibility problems.
type IssueType string

const (
	IssueTypeMissingRamp      IssueType = "missing_ramp"
	IssueTypeDamagedSidewalk  IssueType = "damaged_sidewalk"
	IssueTypeObstruction      IssueType = "obstruction"
	IssueTypeNoTactilePaving  IssueType = "no_tactile_paving"
	IssueTypePothole          IssueType = "pothole"
	IssueTypeNarrowSidewalk   IssueType = "narrow_sidewalk"
)

// IssueSeverity rates how urgent a detected issue is.
type IssueSeverity string

const (
	IssueSeverityCritical IssueSeverity = "critical"
	IssueSeverityHigh     IssueSeverity = "high"
	IssueSeverityMedium   IssueSeverity = "medium"
	IssueSeverityLow      IssueSeverity = "low"
)

// AccessibilityIssue is a single problem detected in a scanned location.
type AccessibilityIssue struct {
	Type        IssueType     `json:"type"`
	Severity    IssueSeverity `json:"severity"`
	Description string        `json:"description"`
	Confidence  float64       `json:"confidence"`
}

// Scan represents a single accessibility audit job for a geographic location.
type Scan struct {
	ID             uuid.UUID            `json:"id"`
	OrganizationID uuid.UUID            `json:"organization_id"`
	District       string               `json:"district"`
	City           string               `json:"city"`
	Latitude       float64              `json:"latitude"`
	Longitude      float64              `json:"longitude"`
	Status         ScanStatus           `json:"status"`
	AccessibilityScore int              `json:"accessibility_score"`
	Issues         []AccessibilityIssue `json:"issues"`
	StreetViewURL  string               `json:"street_view_url,omitempty"`
	AnonymizedImageURL string           `json:"anonymized_image_url,omitempty"`
	ErrorMessage   string               `json:"error_message,omitempty"`
	RequestedBy    uuid.UUID            `json:"requested_by"`
	CreatedAt      time.Time            `json:"created_at"`
	UpdatedAt      time.Time            `json:"updated_at"`
	CompletedAt    *time.Time           `json:"completed_at,omitempty"`
}

// ComplianceLevel returns a human-readable compliance label for the score.
func (s *Scan) ComplianceLevel() string {
	switch {
	case s.AccessibilityScore >= 80:
		return "Uyumlu"
	case s.AccessibilityScore >= 60:
		return "İyileştirme Gerekli"
	default:
		return "Kritik"
	}
}
