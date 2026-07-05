from dataclasses import dataclass
from pathlib import Path
from threading import Lock

import cv2
import numpy as np

from app.core.config import settings

PROJECT_ROOT = Path(__file__).resolve().parents[2]


class FaceEmbeddingError(Exception):
    pass


class InvalidImageError(FaceEmbeddingError):
    pass


class NoFaceDetectedError(FaceEmbeddingError):
    pass


class MultipleFacesDetectedError(FaceEmbeddingError):
    pass


class EmbeddingExtractionError(FaceEmbeddingError):
    pass


@dataclass(frozen=True)
class DetectedFace:
    image: np.ndarray
    data: np.ndarray

    @property
    def bounding_box(self) -> tuple[int, int, int, int]:
        x, y, width, height = self.data[:4]
        return int(x), int(y), int(width), int(height)

    @property
    def landmarks(self) -> np.ndarray:
        return self.data[4:14].reshape(5, 2)

    @property
    def confidence(self) -> float:
        return float(self.data[-1])


@dataclass(frozen=True)
class FaceComparisonResult:
    similarity: float
    matched: bool


class FaceEmbeddingService:
    def __init__(self) -> None:
        detection_model_path = self._resolve_model_path(
            settings.face_detection_model_path
        )
        recognition_model_path = self._resolve_model_path(
            settings.face_recognition_model_path
        )

        self.detector = cv2.FaceDetectorYN.create(
            str(detection_model_path),
            "",
            (320, 320),
            0.9,
            0.3,
            5000,
        )

        self.recognizer = cv2.FaceRecognizerSF.create(
            str(recognition_model_path),
            "",
        )

        self._detector_lock = Lock()
        self._recognizer_lock = Lock()

    def detect_single_face(self, content: bytes) -> DetectedFace:
        image_buffer = np.frombuffer(content, dtype=np.uint8)
        image = cv2.imdecode(image_buffer, cv2.IMREAD_COLOR)

        if image is None:
            raise InvalidImageError("The provided image could not be decoded")

        height, width = image.shape[:2]

        with self._detector_lock:
            self.detector.setInputSize((width, height))
            _, faces = self.detector.detect(image)

        if faces is None or len(faces) == 0:
            raise NoFaceDetectedError("No face was detected")

        if len(faces) > 1:
            raise MultipleFacesDetectedError("Multiple faces were detected")

        face_data = faces[0].astype(np.float32, copy=True)

        return DetectedFace(
            image=image,
            data=face_data,
        )

    @staticmethod
    def _resolve_model_path(configured_path: str) -> Path:
        model_path = Path(configured_path)

        if not model_path.is_absolute():
            model_path = PROJECT_ROOT / model_path

        model_path = model_path.resolve()

        if not model_path.is_file():
            raise RuntimeError(f"Face model file was not found: {model_path}")

        return model_path

    def extract_embedding(self, content: bytes) -> np.ndarray:
        detected_face = self.detect_single_face(content)
        return self.extract_embedding_from_detected_face(detected_face)

    def extract_embedding_from_detected_face(
        self,
        detected_face: DetectedFace,
    ) -> np.ndarray:
        try:
            with self._recognizer_lock:
                aligned_face = self.recognizer.alignCrop(
                    detected_face.image,
                    detected_face.data,
                )

                raw_embedding = self.recognizer.feature(aligned_face)
        except cv2.error as exc:
            raise EmbeddingExtractionError(
                "The face could not be aligned or encoded"
            ) from exc

        if raw_embedding is None:
            raise EmbeddingExtractionError("The face embedding could not be generated")

        embedding = np.asarray(
            raw_embedding,
            dtype=np.float32,
        ).reshape(-1)

        return self._normalize_embedding(embedding)

    def compare_embeddings(
        self,
        first_embedding: np.ndarray,
        second_embedding: np.ndarray,
    ) -> FaceComparisonResult:
        first = self._normalize_embedding(first_embedding)
        second = self._normalize_embedding(second_embedding)

        if first.shape != second.shape:
            raise EmbeddingExtractionError(
                "Face embeddings have incompatible dimensions"
            )

        similarity = float(np.dot(first, second))
        similarity = float(np.clip(similarity, -1.0, 1.0))

        return FaceComparisonResult(
            similarity=similarity,
            matched=similarity >= settings.face_match_cosine_threshold,
        )

    @staticmethod
    def _normalize_embedding(embedding: np.ndarray) -> np.ndarray:
        vector = np.asarray(embedding, dtype=np.float32).reshape(-1)

        if vector.size == 0 or not np.all(np.isfinite(vector)):
            raise EmbeddingExtractionError("Face embedding is invalid")

        norm = float(np.linalg.norm(vector))

        if norm <= 0:
            raise EmbeddingExtractionError("Face embedding has a zero norm")

        return vector / norm
