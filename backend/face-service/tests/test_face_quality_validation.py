import logging
from unittest.mock import Mock

import cv2
import numpy as np
import pytest
from fastapi import HTTPException

from app.services.face_embedding_service import (
    MultipleFacesDetectedError,
    NoFaceDetectedError,
)
from app.services.face_verification_service import FaceVerificationService

FACE_BOX = (460, 150, 360, 420)


def test_clear_webcam_style_face_is_accepted_and_metrics_are_logged(caplog):
    service = FaceVerificationService.__new__(FaceVerificationService)
    frame = webcam_style_frame()

    with caplog.at_level(logging.INFO):
        service._validate_face_quality(frame, FACE_BOX)

    record = next(
        record
        for record in caplog.records
        if record.getMessage().startswith("face_quality_metrics")
    )
    assert record.blur_score >= record.blur_threshold
    assert record.blur_threshold == 15.0
    assert (record.image_width, record.image_height) == (1280, 720)
    assert (record.face_width, record.face_height) == (360, 420)


def test_genuinely_blurry_face_is_rejected():
    service = FaceVerificationService.__new__(FaceVerificationService)
    frame = webcam_style_frame()
    x, y, width, height = FACE_BOX
    frame[y : y + height, x : x + width] = cv2.GaussianBlur(
        frame[y : y + height, x : x + width],
        (9, 9),
        0,
    )

    with pytest.raises(HTTPException) as error:
        service._validate_face_quality(frame, FACE_BOX)

    assert error.value.status_code == 400
    assert error.value.detail == "Image is blurry. Hold still and try again."


@pytest.mark.parametrize(
    ("pixel_value", "expected_detail"),
    [
        (25, "Image is too dark. Improve the lighting and try again."),
        (235, "Image is too bright. Reduce strong light and try again."),
    ],
)
def test_bad_lighting_is_not_reported_as_blur(pixel_value, expected_detail):
    service = FaceVerificationService.__new__(FaceVerificationService)
    frame = np.full((720, 1280, 3), pixel_value, dtype=np.uint8)

    with pytest.raises(HTTPException) as error:
        service._validate_face_quality(frame, FACE_BOX)

    assert error.value.detail == expected_detail


def test_small_detected_face_has_distinct_error():
    service = FaceVerificationService.__new__(FaceVerificationService)
    frame = np.full((720, 1280, 3), 140, dtype=np.uint8)

    with pytest.raises(HTTPException) as error:
        service._validate_face_quality(frame, (580, 300, 90, 90))

    assert error.value.detail == "Face is too small. Move closer to the camera."


@pytest.mark.parametrize(
    ("detection_error", "expected_detail"),
    [
        (
            NoFaceDetectedError("missing"),
            "No face detected. Make sure your face is visible and well lit.",
        ),
        (
            MultipleFacesDetectedError("multiple"),
            "Multiple faces detected. Only one face is allowed.",
        ),
    ],
)
def test_face_detection_failures_remain_distinct(detection_error, expected_detail):
    embedding_service = Mock()
    embedding_service.detect_single_face.side_effect = detection_error
    service = FaceVerificationService(embedding_service=embedding_service)
    service._validate_image_content = Mock()

    with pytest.raises(HTTPException) as error:
        service.validate_face_content(b"validated-image")

    assert error.value.detail == expected_detail


def webcam_style_frame() -> np.ndarray:
    frame = np.full((720, 1280, 3), 145, dtype=np.uint8)
    x, y, width, height = FACE_BOX
    face = np.full((height, width), 145, dtype=np.uint8)
    face = np.clip(
        face.astype(np.float32) + np.linspace(-18, 18, width)[None, :],
        0,
        255,
    ).astype(np.uint8)

    cv2.ellipse(face, (180, 210), (130, 180), 0, 0, 360, 165, -1)
    cv2.ellipse(face, (130, 170), (28, 11), 0, 0, 360, 65, 3)
    cv2.ellipse(face, (230, 170), (28, 11), 0, 0, 360, 65, 3)
    cv2.circle(face, (130, 170), 6, 35, -1)
    cv2.circle(face, (230, 170), 6, 35, -1)
    cv2.line(face, (180, 185), (168, 250), 90, 3)
    cv2.ellipse(face, (180, 290), (55, 20), 0, 0, 180, 70, 3)

    noise = np.random.default_rng(7).normal(0, 1.5, face.shape)
    face = np.clip(face.astype(np.float32) + noise, 0, 255).astype(np.uint8)
    face = cv2.GaussianBlur(face, (3, 3), 0)
    encoded, jpeg = cv2.imencode(".jpg", face, [cv2.IMWRITE_JPEG_QUALITY, 70])
    assert encoded
    face = cv2.imdecode(jpeg, cv2.IMREAD_GRAYSCALE)
    frame[y : y + height, x : x + width] = cv2.cvtColor(face, cv2.COLOR_GRAY2BGR)
    return frame
