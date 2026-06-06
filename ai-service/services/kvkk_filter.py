"""
KVKK Anonimleştirme Filtresi

5378 Sayılı Engelliler Kanunu + KVKK gereklilikleri:
- İnsan yüzleri: Haar Cascade ile tespit → Gaussian blur
- Araç plakaları: renk/kontur analizi → blur

Model çalıştırılmadan önce geri döndürülemez şekilde anonimleştirilir.
"""

import cv2
import numpy as np
import os


class KVKKFilter:
    def __init__(self):
        cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        self.face_cascade = cv2.CascadeClassifier(cascade_path)

    def anonymize(self, image_bytes: bytes) -> bytes:
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return image_bytes

        img = self._blur_faces(img)
        img = self._blur_plates(img)

        _, encoded = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 90])
        return bytes(encoded)

    def _blur_faces(self, img: np.ndarray) -> np.ndarray:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        faces = self.face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
        for (x, y, w, h) in faces:
            roi = img[y : y + h, x : x + w]
            blurred = cv2.GaussianBlur(roi, (99, 99), 30)
            img[y : y + h, x : x + w] = blurred
        return img

    def _blur_plates(self, img: np.ndarray) -> np.ndarray:
        """
        Plaka tespiti: gri ton + erozyon/dilasyon + kontur analizi.
        Gerçek üretim için OpenALPR veya Roboflow plaka modeli önerilir.
        """
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        blur = cv2.bilateralFilter(gray, 11, 17, 17)
        edges = cv2.Canny(blur, 30, 200)

        contours, _ = cv2.findContours(edges, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
        contours = sorted(contours, key=cv2.contourArea, reverse=True)[:20]

        for cnt in contours:
            peri = cv2.arcLength(cnt, True)
            approx = cv2.approxPolyDP(cnt, 0.018 * peri, True)
            if len(approx) == 4:
                x, y, w, h = cv2.boundingRect(approx)
                aspect = w / float(h) if h > 0 else 0
                if 2.0 < aspect < 6.0 and 30 < w < 300 and 10 < h < 100:
                    roi = img[y : y + h, x : x + w]
                    blurred = cv2.GaussianBlur(roi, (51, 51), 20)
                    img[y : y + h, x : x + w] = blurred

        return img
