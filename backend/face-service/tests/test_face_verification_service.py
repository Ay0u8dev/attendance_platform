import asyncio
from io import BytesIO
from unittest.mock import AsyncMock, Mock

import numpy as np
import pytest
from fastapi import HTTPException, UploadFile
from starlette.datastructures import Headers

from app.services.face_embedding_codec import (
    EMBEDDING_DIMENSION,
    EMBEDDING_FORMAT,
    EMBEDDING_MODEL,
    FaceEmbeddingCodec,
)
from app.services.face_embedding_service import FaceEmbeddingService
from app.services.face_verification_service import FaceVerificationService


@pytest.mark.parametrize(
    ("submitted", "expected_match"),
    [
        (np.ones(EMBEDDING_DIMENSION, dtype=np.float32), True),
        (
            np.concatenate(
                [
                    np.ones(EMBEDDING_DIMENSION // 2, dtype=np.float32),
                    -np.ones(EMBEDDING_DIMENSION // 2, dtype=np.float32),
                ]
            ),
            False,
        ),
    ],
)
def test_compares_submitted_and_stored_embeddings(submitted, expected_match):
    embedding_service = FaceEmbeddingService.__new__(FaceEmbeddingService)
    embedding_service.extract_embedding_from_detected_face = Mock(
        return_value=submitted
    )
    service = FaceVerificationService(embedding_service=embedding_service)
    service._read_and_validate_upload = AsyncMock(return_value=b"valid-image")
    service.validate_face_content = Mock(return_value=object())
    stored = np.ones(EMBEDDING_DIMENSION, dtype=np.float32)

    result = asyncio.run(
        service.verify_student_face(
            image=Mock(),
            encoded_embedding=FaceEmbeddingCodec.encode(stored),
            dimension=EMBEDDING_DIMENSION,
            model=EMBEDDING_MODEL,
            format=EMBEDDING_FORMAT,
        )
    )

    assert result.matched is expected_match
    assert -1.0 <= result.similarity <= 1.0


def test_rejects_incompatible_stored_metadata():
    service = FaceVerificationService.__new__(FaceVerificationService)

    with pytest.raises(HTTPException) as error:
        asyncio.run(
            service.verify_student_face(
                image=Mock(),
                encoded_embedding="unused",
                dimension=64,
                model=EMBEDDING_MODEL,
                format=EMBEDDING_FORMAT,
            )
        )

    assert error.value.status_code == 409


def test_rejects_malformed_stored_embedding():
    service = FaceVerificationService.__new__(FaceVerificationService)

    with pytest.raises(HTTPException) as error:
        asyncio.run(
            service.verify_student_face(
                image=Mock(),
                encoded_embedding="not-base64",
                dimension=EMBEDDING_DIMENSION,
                model=EMBEDDING_MODEL,
                format=EMBEDDING_FORMAT,
            )
        )

    assert error.value.status_code == 409


def test_rejects_invalid_submitted_image():
    embedding_service = FaceEmbeddingService.__new__(FaceEmbeddingService)
    service = FaceVerificationService(embedding_service=embedding_service)
    image = UploadFile(
        filename="face.jpg",
        file=BytesIO(b"not-an-image"),
        headers=Headers({"content-type": "image/jpeg"}),
    )
    stored = np.ones(EMBEDDING_DIMENSION, dtype=np.float32)

    with pytest.raises(HTTPException) as error:
        asyncio.run(
            service.verify_student_face(
                image=image,
                encoded_embedding=FaceEmbeddingCodec.encode(stored),
                dimension=EMBEDDING_DIMENSION,
                model=EMBEDDING_MODEL,
                format=EMBEDDING_FORMAT,
            )
        )

    assert error.value.status_code == 400
