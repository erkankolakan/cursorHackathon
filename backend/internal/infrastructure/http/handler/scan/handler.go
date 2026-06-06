package scan

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/application/scan/dto"
	"github.com/masterfabric-go/masterfabric/internal/application/scan/usecase"
	"github.com/masterfabric-go/masterfabric/internal/shared/middleware"
	"github.com/masterfabric-go/masterfabric/internal/shared/pagination"
	"github.com/masterfabric-go/masterfabric/internal/shared/response"
	"github.com/masterfabric-go/masterfabric/internal/shared/validator"
)

// Handler provides HTTP handlers for the scan domain.
type Handler struct {
	createUC *usecase.CreateScanUseCase
	listUC   *usecase.ListScansUseCase
	getUC    *usecase.GetScanUseCase
}

// NewHandler creates a new scan HTTP handler.
func NewHandler(createUC *usecase.CreateScanUseCase, listUC *usecase.ListScansUseCase, getUC *usecase.GetScanUseCase) *Handler {
	return &Handler{createUC: createUC, listUC: listUC, getUC: getUC}
}

// CreateScan handles POST /api/v1/scans
func (h *Handler) CreateScan(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		response.JSON(w, http.StatusUnauthorized, map[string]string{"error": "not authenticated"})
		return
	}

	orgID, ok := middleware.OrgIDFromContext(r.Context())
	if !ok || orgID == uuid.Nil {
		orgIDStr := r.Header.Get("X-Organization-ID")
		if orgIDStr == "" {
			response.JSON(w, http.StatusBadRequest, map[string]string{"error": "X-Organization-ID header required"})
			return
		}
		parsed, err := uuid.Parse(orgIDStr)
		if err != nil {
			response.JSON(w, http.StatusBadRequest, map[string]string{"error": "invalid organization id"})
			return
		}
		orgID = parsed
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

// ListScans handles GET /api/v1/scans
func (h *Handler) ListScans(w http.ResponseWriter, r *http.Request) {
	orgID, ok := middleware.OrgIDFromContext(r.Context())
	if !ok || orgID == uuid.Nil {
		orgIDStr := r.Header.Get("X-Organization-ID")
		if orgIDStr == "" {
			response.JSON(w, http.StatusBadRequest, map[string]string{"error": "X-Organization-ID header required"})
			return
		}
		parsed, err := uuid.Parse(orgIDStr)
		if err != nil {
			response.JSON(w, http.StatusBadRequest, map[string]string{"error": "invalid organization id"})
			return
		}
		orgID = parsed
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

	scan, err := h.getUC.Execute(r.Context(), id)
	if err != nil {
		response.Error(w, err)
		return
	}

	response.JSON(w, http.StatusOK, scan)
}
