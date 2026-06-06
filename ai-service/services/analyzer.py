"""
HuggingFace Model Entegrasyonu

Kullanılan modeller:
1. leeyunjai/yolo11-sidewalk-seg  → curb, hole, sidewalk, cover, lane tespiti
2. projectsidewalk/rampnet-model  → rampa varlığı/yokluğu tespiti
3. ayoubkirouane/Segments-Sidewalk-SegFormer-B0 → semantik segmentasyon (yedek)
"""

import logging
from pathlib import Path

import cv2
import numpy as np

logger = logging.getLogger("kentscan-analyzer")

YOLO_REPO = "leeyunjai/yolo11-sidewalk-seg"
YOLO_FILENAME = "yolo11m-sidewalk-seg.pt"
YOLO_LOCAL_PATH = Path(__file__).resolve().parent.parent / "models" / YOLO_FILENAME


class AccessibilityAnalyzer:
    def __init__(self):
        self._yolo_model = None
        self._rampnet_model = None
        self._segformer = None
        self._load_models()

    def _resolve_yolo_weights(self) -> str:
        if YOLO_LOCAL_PATH.is_file():
            return str(YOLO_LOCAL_PATH)

        from huggingface_hub import hf_hub_download

        logger.info("YOLO weights not found locally, downloading from HuggingFace...")
        return hf_hub_download(
            repo_id=YOLO_REPO,
            filename=YOLO_FILENAME,
            local_dir=str(YOLO_LOCAL_PATH.parent),
        )

    def _load_models(self):
        try:
            from ultralytics import YOLO

            weights_path = self._resolve_yolo_weights()
            logger.info("Loading YOLO11 sidewalk-seg model from %s", weights_path)
            self._yolo_model = YOLO(weights_path)
            logger.info("YOLO11 model loaded successfully")
        except Exception as e:
            logger.warning(f"YOLO11 model not available: {e} — using heuristic fallback")

        try:
            from transformers import AutoModel
            import torch
            logger.info("Loading RampNet model from HuggingFace...")
            self._rampnet_model = AutoModel.from_pretrained(
                "projectsidewalk/rampnet-model",
                trust_remote_code=True,
            )
            self._rampnet_model.eval()
            logger.info("RampNet model loaded successfully")
        except Exception as e:
            logger.warning(f"RampNet model not available: {e}")

    def analyze(self, image_bytes: bytes) -> dict:
        """
        Görüntüyü analiz eder, tespit edilen nesneleri döndürür.
        Returns: {"detections": [...], "ramp_detected": bool, "sidewalk_coverage": float}
        """
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return self._heuristic_fallback(image_bytes)

        result = {
            "detections": [],
            "ramp_detected": False,
            "sidewalk_coverage": 0.0,
            "hole_detected": False,
            "cover_detected": False,
        }

        if self._yolo_model is not None:
            try:
                yolo_results = self._yolo_model(img, verbose=False)
                for r in yolo_results:
                    if r.boxes is not None:
                        for box in r.boxes:
                            cls_id = int(box.cls[0])
                            cls_name = r.names[cls_id]
                            conf = float(box.conf[0])
                            result["detections"].append({"class": cls_name, "confidence": conf})
                            if cls_name == "hole":
                                result["hole_detected"] = True
                            if cls_name == "cover":
                                result["cover_detected"] = True

                    if r.masks is not None:
                        total_pixels = img.shape[0] * img.shape[1]
                        sidewalk_pixels = 0
                        for i, mask in enumerate(r.masks.data):
                            cls_id = int(r.boxes.cls[i])
                            if r.names[cls_id] == "sidewalk":
                                sidewalk_pixels += int(mask.sum().item())
                        result["sidewalk_coverage"] = sidewalk_pixels / total_pixels if total_pixels > 0 else 0
            except Exception as e:
                logger.warning(f"YOLO inference failed: {e}")

        if self._rampnet_model is not None:
            try:
                import torch
                from PIL import Image
                import io
                pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
                with torch.no_grad():
                    ramp_score = self._rampnet_model(pil_img)
                result["ramp_detected"] = bool(ramp_score > 0.5) if hasattr(ramp_score, "__float__") else False
            except Exception as e:
                logger.warning(f"RampNet inference failed: {e}")

        if not result["detections"] and not self._yolo_model:
            result = self._heuristic_fallback(image_bytes)

        return result

    def _heuristic_fallback(self, image_bytes: bytes) -> dict:
        """OpenCV tabanlı basit heuristik analiz."""
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return {"detections": [], "ramp_detected": False, "sidewalk_coverage": 0.4, "hole_detected": False, "cover_detected": False}

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 50, 150)
        edge_density = edges.sum() / (img.shape[0] * img.shape[1] * 255)

        lower_half = img[img.shape[0] // 2 :, :, :]
        gray_lower = cv2.cvtColor(lower_half, cv2.COLOR_BGR2GRAY)
        _, binary = cv2.threshold(gray_lower, 100, 255, cv2.THRESH_BINARY)
        sidewalk_coverage = float(binary.sum()) / (binary.shape[0] * binary.shape[1] * 255)

        return {
            "detections": [{"class": "sidewalk", "confidence": min(sidewalk_coverage * 1.5, 0.95)}],
            "ramp_detected": edge_density > 0.03,
            "sidewalk_coverage": sidewalk_coverage,
            "hole_detected": edge_density > 0.08,
            "cover_detected": False,
        }
