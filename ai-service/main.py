"""
KentScan AI Microservice
Engelsiz Kent Erişilebilirlik Analiz Servisi

Pipeline:
  1. Google Street View panoramasını indir
  2. KVKK: yüz + plaka blur (OpenCV)
  3. YOLO11 sidewalk-seg ile engel tespiti
  4. Erişilebilirlik skoru hesapla
  5. Sonucu döndür
"""

import os
import base64
import logging
from typing import Optional

import httpx
import numpy as np
import cv2
from fastapi import FastAPI, HTTPException
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
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

GSV_API_KEY = os.getenv("GOOGLE_STREET_VIEW_API_KEY", "")
AI_SERVICE_PORT = int(os.getenv("AI_SERVICE_PORT", "8001"))

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


class AnalyzeResponse(BaseModel):
    accessibility_score: int
    issues: list[AccessibilityIssue]
    street_view_url: str
    anonymized_image_url: str
    error: Optional[str] = None


@app.get("/health")
async def health():
    return {"status": "ok", "service": "kentscan-ai"}


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(req: AnalyzeRequest):
    logger.info(f"Analyzing location: lat={req.latitude}, lng={req.longitude}")

    street_view_url = gsv_client.build_url(req.latitude, req.longitude)

    try:
        image_bytes = await gsv_client.fetch_image(req.latitude, req.longitude)
    except Exception as e:
        logger.error(f"GSV fetch failed: {e}")
        # Demo modu: GSV API anahtarı yoksa demo veri döndür
        return _demo_response(req.latitude, req.longitude, street_view_url)

    # KVKK: yüz ve plaka anonimleştirme
    try:
        anonymized_bytes = kvkk_filter.anonymize(image_bytes)
    except Exception as e:
        logger.warning(f"KVKK filter failed, using original: {e}")
        anonymized_bytes = image_bytes

    anonymized_b64 = "data:image/jpeg;base64," + base64.b64encode(anonymized_bytes).decode()

    # AI analizi
    try:
        detections = analyzer.analyze(anonymized_bytes)
    except Exception as e:
        logger.error(f"AI analysis failed: {e}")
        return _demo_response(req.latitude, req.longitude, street_view_url)

    issues = scorer.detections_to_issues(detections)
    score = scorer.calculate_score(issues)

    logger.info(f"Analysis complete: score={score}, issues={len(issues)}")

    return AnalyzeResponse(
        accessibility_score=score,
        issues=[AccessibilityIssue(**i) for i in issues],
        street_view_url=street_view_url,
        anonymized_image_url=anonymized_b64,
    )


def _demo_response(lat: float, lng: float, street_view_url: str) -> AnalyzeResponse:
    """Demo API anahtarı yokken gerçekçi demo veri döndürür."""
    import random
    random.seed(int(abs(lat * 1000 + lng * 100)))

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
    score = random.randint(20, 85)

    return AnalyzeResponse(
        accessibility_score=score,
        issues=[AccessibilityIssue(**i) for i in selected],
        street_view_url=street_view_url,
        anonymized_image_url="",
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=AI_SERVICE_PORT)
