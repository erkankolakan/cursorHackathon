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


LEGAL_REFERENCES = {
    "missing_ramp": "5378 Sayılı Kanun Madde 7 — Yaya Geçidi Rampa Zorunluluğu",
    "damaged_sidewalk": "5378 Sayılı Kanun Madde 9 — Kaldırım Erişilebilirliği",
    "obstruction": "5378 Sayılı Kanun Madde 9 — Engelsiz Yaya Yolu Gerekliliği",
    "no_tactile_paving": "5378 Sayılı Kanun Madde 7 — Görme Engelli Yönlendirme Yüzeyi",
    "pothole": "Karayolları Trafik Kanunu Madde 19 — Yol Bakım Yükümlülüğü",
    "narrow_sidewalk": "5378 Sayılı Kanun Madde 9 — Min. Kaldırım Genişliği (≥1.5 m)",
}

RECOMMENDATIONS = {
    "missing_ramp": "Yaya geçidine tekerlekli sandalye standartlarında (eğim ≤8%, genişlik ≥90 cm) beton rampa inşa edilmelidir.",
    "damaged_sidewalk": "Hasarlı kaldırım döşemesi sökülüp kaydırmaz kaplama ile yeniden döşenmeli; pürüzsüz ve sürekli yüzey sağlanmalıdır.",
    "obstruction": "Yaya yolundaki engel (tabela, direk, araç vb.) kaldırılmalı; en az 1.5 m serbest geçiş alanı sağlanmalıdır.",
    "no_tactile_paving": "Görme engelliler için sarı/turuncu hissedilebilir uyarı ve yönlendirme yüzeyleri (TGS) döşenmelidir.",
    "pothole": "Çukur ve bozulmuş yüzey derhal doldurulup asfalt düzeltmesi yapılmalı; tekrar oluşumu önlemek için drenaj kontrol edilmelidir.",
    "narrow_sidewalk": "Kaldırım genişliği en az 1.5 m (tercihan 2.0 m) olacak şekilde genişletilmeli, bisiklet yolu varsa ayrılmalıdır.",
}

ESTIMATED_COSTS = {
    "missing_ramp": 45000,
    "damaged_sidewalk": 85000,
    "obstruction": 5000,
    "no_tactile_paving": 30000,
    "pothole": 15000,
    "narrow_sidewalk": 120000,
}


class AccessibilityScorer:
    SEVERITY_MAP = {
        "hole": ("pothole", "high", "Yol/kaldırım yüzeyinde çukur veya hasar tespit edildi"),
        "curb": ("missing_ramp", "critical", "Kaldırım bordürü mevcut, rampa eksik olabilir"),
        "cover": ("obstruction", "medium", "Kaldırım üzerinde kapak/engel tespit edildi"),
        "lane": ("narrow_sidewalk", "low", "Şerit yapısı kaldırım genişliğini kısıtlıyor"),
        "sidewalk": (None, None, None),
    }

    def _enrich_issue(self, issue: dict) -> dict:
        issue_type = issue.get("type", "")
        issue["recommendation"] = RECOMMENDATIONS.get(issue_type, "Yetkili belediye birimi tarafından değerlendirme yapılmalıdır.")
        issue["legal_reference"] = LEGAL_REFERENCES.get(issue_type, "5378 Sayılı Engelliler Kanunu")
        issue["estimated_cost"] = ESTIMATED_COSTS.get(issue_type, 20000)
        return issue

    def detections_to_issues(self, analysis: dict) -> list[dict]:
        issues = []

        if not analysis.get("ramp_detected", True):
            ramp_conf = analysis.get("ramp_confidence", 0.0)
            issues.append(self._enrich_issue({
                "type": "missing_ramp",
                "severity": "critical",
                "description": "Yaya geçidinde tekerlekli sandalye rampası tespit edilemedi",
                "confidence": round(max(0.55, 1.0 - ramp_conf), 2),
            }))

        for det in analysis.get("detections", []):
            cls = det.get("class")
            conf = det.get("confidence", 0.5)
            if cls not in self.SEVERITY_MAP:
                continue
            issue_type, severity, description = self.SEVERITY_MAP[cls]
            if issue_type is None:
                continue
            issues.append(self._enrich_issue({
                "type": issue_type,
                "severity": severity,
                "description": description,
                "confidence": round(conf, 2),
            }))

        if analysis.get("hole_detected"):
            existing_types = {i["type"] for i in issues}
            if "pothole" not in existing_types:
                hole_conf = max(
                    (d.get("confidence", 0.5) for d in analysis.get("detections", []) if d.get("class") == "hole"),
                    default=0.80,
                )
                issues.append(self._enrich_issue({
                    "type": "pothole",
                    "severity": "high",
                    "description": "Kaldırım/yol yüzeyinde çukur tespit edildi",
                    "confidence": round(hole_conf, 2),
                }))

        sidewalk_cov = analysis.get("sidewalk_coverage", 0.5)
        if sidewalk_cov < 0.2:
            existing_types = {i["type"] for i in issues}
            if "no_tactile_paving" not in existing_types:
                issues.append(self._enrich_issue({
                    "type": "no_tactile_paving",
                    "severity": "high",
                    "description": "Görme engelliler için hissedilebilir zemin yüzeyi tespit edilemedi",
                    "confidence": round(max(0.55, 1.0 - sidewalk_cov), 2),
                }))

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

    def calculate_total_cost(self, issues: list[dict]) -> int:
        """Returns total estimated remediation cost in TL."""
        return sum(i.get("estimated_cost", 0) for i in issues)
