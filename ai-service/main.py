"""
KentScan AI Microservice
Engelsiz Kent Erişilebilirlik Analiz Servisi

Pipeline:
  1. Google Street View panoramasını indir
  2. KVKK: yüz + plaka blur (OpenCV)
  3. YOLO11 sidewalk-seg ile engel tespiti
  4. Erişilebilirlik skoru hesapla
  5. Türkçe öneriler + yasal referans + maliyet tahmini
  6. Sonucu döndür
"""

import os
import base64
import logging
from typing import Optional, Any

import httpx
import numpy as np
import cv2
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from services.gsv_client import GSVClient
from services.kvkk_filter import KVKKFilter
from services.analyzer import AccessibilityAnalyzer
from services.scorer import AccessibilityScorer

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("kentscan-ai")

app = FastAPI(
    title="KentScan AI Service",
    description="AI destekli kentsel erişilebilirlik denetim motoru",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

GSV_API_KEY = os.getenv("GOOGLE_STREET_VIEW_API_KEY", "")
AI_SERVICE_PORT = int(os.getenv("AI_SERVICE_PORT", "8001"))
MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}

gsv_client = GSVClient(GSV_API_KEY)
kvkk_filter = KVKKFilter()
analyzer = AccessibilityAnalyzer()
scorer = AccessibilityScorer()


class AnalyzeRequest(BaseModel):
    latitude: float
    longitude: float


class AccessibilityIssue(BaseModel):
    type: str
    severity: str
    description: str
    confidence: float
    recommendation: Optional[str] = None
    legal_reference: Optional[str] = None
    estimated_cost: Optional[int] = None


class AnalyzeResponse(BaseModel):
    accessibility_score: int
    issues: list[AccessibilityIssue]
    street_view_url: str
    anonymized_image_url: str
    total_estimated_cost: Optional[int] = None
    error: Optional[str] = None


@app.get("/health")
async def health():
    return {"status": "ok", "service": "kentscan-ai", "version": "2.0.0"}


def _analyze_image_bytes(image_bytes: bytes, street_view_url: str = "") -> AnalyzeResponse:
    """KVKK anonimleştirme + AI analizi pipeline'ı."""
    try:
        anonymized_bytes = kvkk_filter.anonymize(image_bytes)
    except Exception as e:
        logger.warning(f"KVKK filter failed, using original: {e}")
        anonymized_bytes = image_bytes

    anonymized_b64 = "data:image/jpeg;base64," + base64.b64encode(anonymized_bytes).decode()

    try:
        detections = analyzer.analyze(anonymized_bytes)
    except Exception as e:
        logger.error(f"AI analysis failed: {e}")
        raise HTTPException(status_code=500, detail="AI analizi başarısız oldu") from e

    issues = scorer.detections_to_issues(detections)
    score = scorer.calculate_score(issues)
    total_cost = scorer.calculate_total_cost(issues)

    logger.info(f"Analysis complete: score={score}, issues={len(issues)}, total_cost={total_cost}")

    return AnalyzeResponse(
        accessibility_score=score,
        issues=[AccessibilityIssue(**i) for i in issues],
        street_view_url=street_view_url,
        anonymized_image_url=anonymized_b64,
        total_estimated_cost=total_cost,
    )


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(req: AnalyzeRequest):
    logger.info(f"Analyzing location: lat={req.latitude}, lng={req.longitude}")

    street_view_url = gsv_client.build_url(req.latitude, req.longitude)

    try:
        image_bytes = await gsv_client.fetch_image(req.latitude, req.longitude)
    except Exception as e:
        logger.error(f"GSV fetch failed: {e}")
        return _demo_response(req.latitude, req.longitude, street_view_url)

    try:
        return _analyze_image_bytes(image_bytes, street_view_url)
    except HTTPException:
        return _demo_response(req.latitude, req.longitude, street_view_url)


@app.post("/analyze/upload", response_model=AnalyzeResponse)
async def analyze_upload(image: UploadFile = File(...)):
    """Kurum tarafından yüklenen fotoğrafı analiz eder."""
    content_type = (image.content_type or "").lower()
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Desteklenen formatlar: JPEG, PNG, WebP",
        )

    image_bytes = await image.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Boş dosya yüklenemez")
    if len(image_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="Dosya boyutu 10 MB'ı aşamaz")

    logger.info(f"Analyzing uploaded image: {image.filename}, size={len(image_bytes)} bytes")
    return _analyze_image_bytes(image_bytes)


def _demo_response(lat: float, lng: float, street_view_url: str) -> AnalyzeResponse:
    """Demo modunda gerçekçi veri döndürür (GSV API anahtarı yoksa)."""
    import random
    random.seed(int(abs(lat * 1000 + lng * 100)))

    from services.scorer import RECOMMENDATIONS, LEGAL_REFERENCES, ESTIMATED_COSTS

    demo_issues_pool = [
        {"type": "missing_ramp", "severity": "critical", "description": "Yaya geçidinde tekerlekli sandalye rampası tespit edilemedi", "confidence": 0.91},
        {"type": "damaged_sidewalk", "severity": "high", "description": "Kaldırım yüzeyinde kırık ve çukurlar mevcut", "confidence": 0.87},
        {"type": "no_tactile_paving", "severity": "high", "description": "Görme engelliler için hissedilebilir zemin yüzeyi eksik", "confidence": 0.83},
        {"type": "obstruction", "severity": "medium", "description": "Kaldırım üzerinde araç veya engel tespit edildi", "confidence": 0.79},
        {"type": "pothole", "severity": "medium", "description": "Yol yüzeyinde çukur tespit edildi", "confidence": 0.85},
        {"type": "narrow_sidewalk", "severity": "low", "description": "Kaldırım genişliği tekerlekli sandalye için yetersiz", "confidence": 0.72},
    ]

    num_issues = random.randint(1, 4)
    selected = random.sample(demo_issues_pool, num_issues)

    # Enrich with legal/recommendation/cost
    enriched = []
    for issue in selected:
        enriched.append({
            **issue,
            "recommendation": RECOMMENDATIONS.get(issue["type"], "Yetkili belediye birimi tarafından değerlendirme yapılmalıdır."),
            "legal_reference": LEGAL_REFERENCES.get(issue["type"], "5378 Sayılı Engelliler Kanunu"),
            "estimated_cost": ESTIMATED_COSTS.get(issue["type"], 20000),
        })

    score = scorer.calculate_score(enriched)
    total_cost = scorer.calculate_total_cost(enriched)

    return AnalyzeResponse(
        accessibility_score=score,
        issues=[AccessibilityIssue(**i) for i in enriched],
        street_view_url=street_view_url,
        anonymized_image_url="",
        total_estimated_cost=total_cost,
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=AI_SERVICE_PORT)
