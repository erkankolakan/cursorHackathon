"""
Google Street View API istemcisi.
İlk 10.000 istek ücretsiz kotası dahilinde panoramik görüntü çeker.
"""

import httpx


class GSVClient:
    BASE_METADATA_URL = "https://maps.googleapis.com/maps/api/streetview/metadata"
    BASE_IMAGE_URL = "https://maps.googleapis.com/maps/api/streetview"

    def __init__(self, api_key: str):
        self.api_key = api_key

    def build_url(self, lat: float, lng: float, size: str = "640x480") -> str:
        if not self.api_key:
            return f"https://maps.googleapis.com/maps/api/streetview?size={size}&location={lat},{lng}&key=DEMO"
        return (
            f"{self.BASE_IMAGE_URL}?size={size}"
            f"&location={lat},{lng}"
            f"&fov=90&heading=0&pitch=0"
            f"&key={self.api_key}"
        )

    async def fetch_image(self, lat: float, lng: float, size: str = "640x480") -> bytes:
        if not self.api_key:
            raise ValueError("GOOGLE_STREET_VIEW_API_KEY not configured - using demo mode")

        url = self.build_url(lat, lng, size)
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            if resp.headers.get("content-type", "").startswith("application/json"):
                raise ValueError(f"GSV returned error: {resp.text}")
            return resp.content
