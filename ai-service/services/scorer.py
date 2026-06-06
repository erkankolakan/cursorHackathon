"""
Erişilebilirlik Skorlama Motoru

5378 Sayılı Engelliler Kanunu kriterlerine göre 0-100 puan hesaplar.

Puan dağılımı:
  Rampa mevcut ve işlevsel      → +30 puan
  Kaldırım hasarsız             → +25 puan
  Engel yok                     → +20 puan
  Hissedilebilir zemin yüzeyi   → +15 puan
  Yeterli kaldırım kapsama alanı → +10 puan
"""

from typing import Any


class AccessibilityScorer:
    SEVERITY_MAP = {
        "hole": ("pothole", "high", "Yol/kaldırım yüzeyinde çukur veya hasar tespit edildi"),
        "curb": ("missing_ramp", "critical", "Kaldırım bordürü mevcut, rampa eksik olabilir"),
        "cover": ("obstruction", "medium", "Kaldırım üzerinde kapak/engel tespit edildi"),
        "lane": ("narrow_sidewalk", "low", "Şerit yapısı kaldırım genişliğini kısıtlıyor"),
        "sidewalk": (None, None, None),
    }

    def detections_to_issues(self, analysis: dict) -> list[dict]:
        issues = []

        if not analysis.get("ramp_detected", True):
            issues.append({
                "type": "missing_ramp",
                "severity": "critical",
                "description": "Yaya geçidinde tekerlekli sandalye rampası tespit edilemedi",
                "confidence": 0.88,
            })

        for det in analysis.get("detections", []):
            cls = det.get("class")
            conf = det.get("confidence", 0.5)
            if cls not in self.SEVERITY_MAP:
                continue
            issue_type, severity, description = self.SEVERITY_MAP[cls]
            if issue_type is None:
                continue
            issues.append({
                "type": issue_type,
                "severity": severity,
                "description": description,
                "confidence": round(conf, 2),
            })

        if analysis.get("hole_detected"):
            existing_types = {i["type"] for i in issues}
            if "pothole" not in existing_types:
                issues.append({
                    "type": "pothole",
                    "severity": "high",
                    "description": "Kaldırım/yol yüzeyinde çukur tespit edildi",
                    "confidence": 0.80,
                })

        sidewalk_cov = analysis.get("sidewalk_coverage", 0.5)
        if sidewalk_cov < 0.2:
            issues.append({
                "type": "no_tactile_paving",
                "severity": "high",
                "description": "Görme engelliler için hissedilebilir zemin yüzeyi tespit edilemedi",
                "confidence": 0.75,
            })

        return issues

    def calculate_score(self, issues: list[dict]) -> int:
        score = 100

        for issue in issues:
            severity = issue.get("severity", "low")
            if severity == "critical":
                score -= 30
            elif severity == "high":
                score -= 20
            elif severity == "medium":
                score -= 10
            elif severity == "low":
                score -= 5

        return max(0, min(100, score))
