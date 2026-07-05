from io import BytesIO
import logging

import cv2
import numpy as np
from fastapi import HTTPException, UploadFile, status
from PIL import Image, UnidentifiedImageError

from app.core.config import settings

from dataclasses import dataclass

from app.services.face_embedding_service import (
    DetectedFace,
    FaceComparisonResult,
    FaceEmbeddingService,
    InvalidImageError,
    MultipleFacesDetectedError,
    NoFaceDetectedError,
)

from app.services.face_embedding_codec import (
    EMBEDDING_DIMENSION,
    EMBEDDING_FORMAT,
    EMBEDDING_MODEL,
    FaceEmbeddingCodec,
    FaceEmbeddingCodecError,
)
from app.services.face_embedding_service import EmbeddingExtractionError

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class PreparedFaceEnrollment:
    encoded_embedding: str
    dimension: int
    model: str
    format: str


class FaceVerificationService:

    def __init__(
        self,
        embedding_service: FaceEmbeddingService | None = None,
    ) -> None:

        self.embedding_service = embedding_service or FaceEmbeddingService()

    async def verify_student_face(
        self,
        image: UploadFile,
        encoded_embedding: str,
        dimension: int,
        model: str,
        format: str,
    ) -> FaceComparisonResult:
        if (
            dimension != EMBEDDING_DIMENSION
            or model != EMBEDDING_MODEL
            or format != EMBEDDING_FORMAT
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Stored face profile is incompatible. Please enroll again.",
            )

        try:
            stored_embedding = FaceEmbeddingCodec.decode(encoded_embedding)
        except FaceEmbeddingCodecError as exc:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Stored face profile is invalid. Please enroll again.",
            ) from exc

        content = await self._read_and_validate_upload(image)
        detected_face = self.validate_face_content(content)

        try:
            submitted_embedding = (
                self.embedding_service.extract_embedding_from_detected_face(
                    detected_face
                )
            )
            return self.embedding_service.compare_embeddings(
                submitted_embedding,
                stored_embedding,
            )
        except EmbeddingExtractionError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="A reliable face comparison could not be completed.",
            ) from exc

    async def _read_and_validate_upload(self, image: UploadFile) -> bytes:
        if not image.content_type or not image.content_type.startswith("image/"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file must be an image",
            )

        content = await image.read()
        if not content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Image is empty",
            )

        if len(content) > settings.max_image_size_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Image is too large",
            )

        return content

    def _validate_image_content(self, content: bytes) -> None:
        try:
            with Image.open(BytesIO(content)) as img:
                img.verify()
        except (UnidentifiedImageError, OSError) as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid image file",
            ) from exc

        try:
            with Image.open(BytesIO(content)) as img:
                width, height = img.size
                image_format = img.format
        except (UnidentifiedImageError, OSError) as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid image file",
            ) from exc

        if image_format not in {"JPEG", "PNG"}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only JPEG and PNG images are supported",
            )

        if width < 160 or height < 160:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Image is too small for face verification",
            )

        if width > 4000 or height > 4000:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Image dimensions are too large",
            )

    def validate_face_content(self, content: bytes) -> DetectedFace:
        self._validate_image_content(content)

        try:
            detected_face = self.embedding_service.detect_single_face(content)
        except InvalidImageError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid image file",
            ) from exc
        except NoFaceDetectedError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "No face detected. Make sure your face is visible " "and well lit."
                ),
            ) from exc
        except MultipleFacesDetectedError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Multiple faces detected. Only one face is allowed.",
            ) from exc

        self._validate_face_quality(
            detected_face.image,
            detected_face.bounding_box,
        )

        return detected_face

    def _validate_face_quality(
        self,
        image: np.ndarray,
        face_box: tuple[int, int, int, int],
    ) -> None:
        gray_image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        image_height, image_width = gray_image.shape[:2]
        x, y, width, height = face_box

        crop_left = max(0, x)
        crop_top = max(0, y)
        crop_right = min(image_width, x + width)
        crop_bottom = min(image_height, y + height)
        crop_width = crop_right - crop_left
        crop_height = crop_bottom - crop_top

        face_area = max(0, crop_width) * max(0, crop_height)
        image_area = image_width * image_height
        face_ratio = face_area / image_area if image_area else 0

        if crop_width < 100 or crop_height < 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Face is too small. Move closer to the camera.",
            )

        if face_ratio < 0.08:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Face is too far from the camera.",
            )

        center_x = x + width / 2
        center_y = y + height / 2

        horizontal_offset = abs(center_x - image_width / 2) / image_width
        vertical_offset = abs(center_y - image_height / 2) / image_height

        if horizontal_offset > 0.25 or vertical_offset > 0.25:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Face is not centered. Place your face inside the guide.",
            )

        face_region = gray_image[crop_top:crop_bottom, crop_left:crop_right]

        if face_region.size == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Detected face region is invalid.",
            )

        brightness = float(np.mean(face_region))
        blur_score = float(cv2.Laplacian(face_region, cv2.CV_64F).var())
        blur_threshold = settings.face_blur_laplacian_threshold

        logger.info(
            (
                "face_quality_metrics blur_score=%.2f blur_threshold=%.2f "
                "image_width=%d image_height=%d face_width=%d face_height=%d"
            ),
            blur_score,
            blur_threshold,
            image_width,
            image_height,
            crop_width,
            crop_height,
            extra={
                "blur_score": blur_score,
                "blur_threshold": blur_threshold,
                "image_width": image_width,
                "image_height": image_height,
                "face_width": crop_width,
                "face_height": crop_height,
            },
        )

        if brightness < 45:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Image is too dark. Improve the lighting and try again.",
            )

        if brightness > 225:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Image is too bright. Reduce strong light and try again.",
            )

        if blur_score < blur_threshold:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Image is blurry. Hold still and try again.",
            )

    async def prepare_student_enrollment(
        self,
        image: UploadFile,
    ) -> PreparedFaceEnrollment:
        content = await self._read_and_validate_upload(image)
        return self.prepare_enrollment_content(content)

    def prepare_enrollment_content(
        self,
        content: bytes,
    ) -> PreparedFaceEnrollment:
        detected_face = self.validate_face_content(content)

        try:
            embedding = self.embedding_service.extract_embedding_from_detected_face(
                detected_face
            )
            encoded_embedding = FaceEmbeddingCodec.encode(embedding)
        except (EmbeddingExtractionError, FaceEmbeddingCodecError) as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    "A reliable face profile could not be generated. "
                    "Please capture a new image."
                ),
            ) from exc

        return PreparedFaceEnrollment(
            encoded_embedding=encoded_embedding,
            dimension=EMBEDDING_DIMENSION,
            model=EMBEDDING_MODEL,
            format=EMBEDDING_FORMAT,
        )
