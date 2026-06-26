from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    attendance_service_url: str = "http://localhost:8083"
    user_service_url: str = "http://localhost:8082"
    internal_service_token: str = Field(min_length=1)
    max_image_size_bytes: int = 2_000_000
    http_timeout_seconds: float = 10.0
    http_connect_timeout_seconds: float = 3.0
    http_read_timeout_seconds: float = 10.0
    face_match_cosine_threshold: float = 0.363
    face_blur_laplacian_threshold: float = Field(default=15.0, gt=0)

    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    face_detection_model_path: str = "models/face_detection_yunet_2023mar.onnx"
    face_recognition_model_path: str = "models/face_recognition_sface_2021dec.onnx"


settings = Settings()
