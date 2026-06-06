package scan

import (
	"io"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/application/scan/dto"
	"github.com/masterfabric-go/masterfabric/internal/application/scan/usecase"
	"github.com/masterfabric-go/masterfabric/internal/shared/middleware"
	"github.com/masterfabric-go/masterfabric/internal/shared/pagination"
	"github.com/masterfabric-go/masterfabric/internal/shared/response"
	"github.com/masterfabric-go/masterfabric/internal/shared/validator"
)

const maxUploadBytes = 10 << 20 // 10 MB

// Handler provides HTTP handlers for the scan domain.
type Handler struct {
	createUC       *usecase.CreateScanUseCase
	createUploadUC *usecase.CreateUploadScanUseCase
	listUC         *usecase.ListScansUseCase
	getUC          *usecase.GetScanUseCase
	statsUC        *usecase.GetStatsUseCase
}

// NewHandler creates a new scan HTTP handler.
func NewHandler(
	createUC *usecase.CreateScanUseCase,
	createUploadUC *usecase.CreateUploadScanUseCase,
	listUC *usecase.ListScansUseCase,
	getUC *usecase.GetScanUseCase,
	statsUC *usecase.GetStatsUseCase,
) *Handler {
	return &Handler{
		createUC:       createUC,
		createUploadUC: createUploadUC,
		listUC:         listUC,
		getUC:          getUC,
		statsUC:        statsUC,
	}
}

func resolveOrgID(r *http.Request) (uuid.UUID, bool) {
	orgID, ok := middleware.OrgIDFromContext(r.Context())
	if ok && orgID != uuid.Nil {
		return orgID, true
	}
	orgIDStr := r.Header.Get("X-Organization-ID")
	if orgIDStr == "" {
		return uuid.Nil, false
	}
	parsed, err := uuid.Parse(orgIDStr)
	if err != nil {
		return uuid.Nil, false
	}
	return parsed, true
}

// CreateScan handles POST /api/v1/scans
func (h *Handler) CreateScan(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		response.JSON(w, http.StatusUnauthorized, map[string]string{"error": "not authenticated"})
		return
	}

	orgID, ok := resolveOrgID(r)
	if !ok {
		response.JSON(w, http.StatusBadRequest, map[string]string{"error": "X-Organization-ID header required"})
		return
	}

	var req dto.CreateScanRequest
	if err := validator.DecodeAndValidate(r, &req); err != nil {
		response.JSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	result, err := h.createUC.Execute(r.Context(), orgID, userID, req)
	if err != nil {
		response.Error(w, err)
		return
	}

	response.Created(w, result)
}

// CreateScanFromUpload handles POST /api/v1/scans/upload (multipart/form-data).
func (h *Handler) CreateScanFromUpload(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		response.JSON(w, http.StatusUnauthorized, map[string]string{"error": "not authenticated"})
		return
	}

	orgID, ok := resolveOrgID(r)
	if !ok {
		response.JSON(w, http.StatusBadRequest, map[string]string{"error": "X-Organization-ID header required"})
		return
	}

	if err := r.ParseMultipartForm(maxUploadBytes); err != nil {
		response.JSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz form verisi veya dosya çok büyük"})
		return
	}

	file, header, err := r.FormFile("image")
	if err != nil {
		response.JSON(w, http.StatusBadRequest, map[string]string{"error": "image alanı zorunludur"})
		return
	}
	defer file.Close()

	imageBytes, err := io.ReadAll(io.LimitReader(file, maxUploadBytes+1))
	if err != nil {
		response.JSON(w, http.StatusBadRequest, map[string]string{"error": "dosya okunamadı"})
		return
	}
	if len(imageBytes) > maxUploadBytes {
		response.JSON(w, http.StatusBadRequest, map[string]string{"error": "dosya boyutu 10 MB'ı aşamaz"})
		return
	}

	district := r.FormValue("district")
	city := r.FormValue("city")
	if district == "" || city == "" {
		response.JSON(w, http.StatusBadRequest, map[string]string{"error": "district ve city alanları zorunludur"})
		return
	}

	lat, _ := strconv.ParseFloat(r.FormValue("latitude"), 64)
	lng, _ := strconv.ParseFloat(r.FormValue("longitude"), 64)

	req := dto.CreateUploadScanRequest{
		Neighbourhood: r.FormValue("neighbourhood"),
		District:      district,
		City:          city,
		Latitude:      lat,
		Longitude:     lng,
	}

	filename := header.Filename
	if filename == "" {
		filename = "upload.jpg"
	}

	result, err := h.createUploadUC.Execute(r.Context(), orgID, userID, req, imageBytes, filename)
	if err != nil {
		response.JSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	response.Created(w, result)
}

// ListScans handles GET /api/v1/scans
func (h *Handler) ListScans(w http.ResponseWriter, r *http.Request) {
	orgID, ok := resolveOrgID(r)
	if !ok {
		response.JSON(w, http.StatusBadRequest, map[string]string{"error": "X-Organization-ID header required"})
		return
	}

	params := pagination.FromRequest(r)

	scans, total, err := h.listUC.Execute(r.Context(), orgID, params.Offset(), params.Limit())
	if err != nil {
		response.Error(w, err)
		return
	}

	response.JSON(w, http.StatusOK, pagination.NewResult(scans, params, total))
}

// GetScan handles GET /api/v1/scans/{id}
func (h *Handler) GetScan(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.JSON(w, http.StatusBadRequest, map[string]string{"error": "invalid scan id"})
		return
	}

	orgID, _ := resolveOrgID(r)

	scan, err := h.getUC.Execute(r.Context(), id, orgID)
	if err != nil {
		response.Error(w, err)
		return
	}

	response.JSON(w, http.StatusOK, scan)
}

// GetStats handles GET /api/v1/scans/stats
func (h *Handler) GetStats(w http.ResponseWriter, r *http.Request) {
	orgID, ok := resolveOrgID(r)
	if !ok {
		response.JSON(w, http.StatusBadRequest, map[string]string{"error": "X-Organization-ID header required"})
		return
	}

	stats, err := h.statsUC.Execute(r.Context(), orgID)
	if err != nil {
		response.Error(w, err)
		return
	}

	response.JSON(w, http.StatusOK, stats)
}
