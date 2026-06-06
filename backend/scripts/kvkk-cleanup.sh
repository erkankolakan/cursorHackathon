#!/usr/bin/env bash
# =============================================================================
# KentScan KVKK Veri Silme Scripti
# 5. Madde — Veri Minimizasyonu ve Hackathon Sonu Silme Yükümlülüğü
#
# Kullanım:
#   ./scripts/kvkk-cleanup.sh              # Sadece anonymized_image_url temizle
#   ./scripts/kvkk-cleanup.sh --all        # Tüm scan verilerini sil
#   ./scripts/kvkk-cleanup.sh --dry-run    # Neyin silineceğini göster, silme
# =============================================================================

set -euo pipefail

DB_DSN="${DB_DSN:-postgres://masterfabric:masterfabric@localhost:5432/masterfabric?sslmode=disable}"
DRY_RUN=false
DELETE_ALL=false
LOG_FILE="kvkk-deletion-$(date +%Y%m%d-%H%M%S).log"

for arg in "$@"; do
  case $arg in
    --dry-run) DRY_RUN=true ;;
    --all) DELETE_ALL=true ;;
  esac
done

echo "============================================================" | tee -a "$LOG_FILE"
echo "KentScan KVKK Veri Silme Belgesi" | tee -a "$LOG_FILE"
echo "Tarih: $(date '+%Y-%m-%d %H:%M:%S %Z')" | tee -a "$LOG_FILE"
echo "Sorumlu: KentScan Takımı" | tee -a "$LOG_FILE"
echo "Dry-run: $DRY_RUN" | tee -a "$LOG_FILE"
echo "============================================================" | tee -a "$LOG_FILE"

# Toplam kayıt sayısı
TOTAL=$(psql "$DB_DSN" -t -c "SELECT COUNT(*) FROM scans WHERE anonymized_image_url IS NOT NULL AND anonymized_image_url != '';" 2>/dev/null | tr -d '[:space:]')
echo "Anonimleştirilmiş görüntü içeren kayıt sayısı: $TOTAL" | tee -a "$LOG_FILE"

if [[ "$DRY_RUN" == "true" ]]; then
  echo "[DRY-RUN] Gerçek silme yapılmadı. Aşağıdaki SQL çalıştırılacaktı:" | tee -a "$LOG_FILE"
  echo "  UPDATE scans SET anonymized_image_url = NULL WHERE anonymized_image_url IS NOT NULL;" | tee -a "$LOG_FILE"
  if [[ "$DELETE_ALL" == "true" ]]; then
    echo "  DELETE FROM scans;" | tee -a "$LOG_FILE"
  fi
  exit 0
fi

# anonymized_image_url alanlarını temizle (KVKK: geçici görüntü verisi)
echo "anonymized_image_url alanları temizleniyor..." | tee -a "$LOG_FILE"
psql "$DB_DSN" -c "UPDATE scans SET anonymized_image_url = NULL WHERE anonymized_image_url IS NOT NULL AND anonymized_image_url != '';" 2>&1 | tee -a "$LOG_FILE"
echo "OK: $TOTAL kayıttaki görüntü verisi silindi." | tee -a "$LOG_FILE"

if [[ "$DELETE_ALL" == "true" ]]; then
  SCAN_COUNT=$(psql "$DB_DSN" -t -c "SELECT COUNT(*) FROM scans;" 2>/dev/null | tr -d '[:space:]')
  echo "Tüm tarama verileri siliniyor ($SCAN_COUNT kayıt)..." | tee -a "$LOG_FILE"
  psql "$DB_DSN" -c "DELETE FROM scans;" 2>&1 | tee -a "$LOG_FILE"
  echo "OK: Tüm scan verileri silindi." | tee -a "$LOG_FILE"
fi

echo "============================================================" | tee -a "$LOG_FILE"
echo "KVKK Uyum Belgesi oluşturuldu: $LOG_FILE" | tee -a "$LOG_FILE"
echo "Bu belge KVKK madde 12 kapsamında saklanmalıdır." | tee -a "$LOG_FILE"
echo "============================================================" | tee -a "$LOG_FILE"
