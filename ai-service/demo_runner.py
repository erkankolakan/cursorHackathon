"""
KentScan Demo Runner
Gerçek İstanbul koordinatları ile demo analiz çalıştırır.
GSV API anahtarı olmadan demo modu kullanılır.

Kullanım:
  python demo_runner.py
"""

import asyncio
import json
import httpx

AI_SERVICE_URL = "http://localhost:8001"

async def run_demo():
    with open("demo_locations.json") as f:
        locations = json.load(f)

    print("\n" + "="*60)
    print("KentScan Demo — İstanbul Erişilebilirlik Taraması")
    print("="*60 + "\n")

    async with httpx.AsyncClient(timeout=30) as client:
        for loc in locations:
            print(f"📍 {loc['district']}, {loc['city']} ({loc['notes']})")
            try:
                resp = await client.post(f"{AI_SERVICE_URL}/analyze", json={
                    "latitude": loc["latitude"],
                    "longitude": loc["longitude"],
                })
                data = resp.json()
                score = data["accessibility_score"]
                level = "✅ Uyumlu" if score >= 80 else "⚠️ İyileştirme" if score >= 60 else "🚨 Kritik"
                print(f"   Skor: {score}/100 — {level}")
                for issue in data.get("issues", [])[:2]:
                    print(f"   • [{issue['severity'].upper()}] {issue['description']}")
                print()
            except Exception as e:
                print(f"   Hata: {e}\n")

if __name__ == "__main__":
    asyncio.run(run_demo())
