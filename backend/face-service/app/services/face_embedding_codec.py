import base64
import binascii

import numpy as np

EMBEDDING_DIMENSION = 128
EMBEDDING_MODEL = "opencv_sface_2021dec"
EMBEDDING_FORMAT = "float32_little_endian_v1"


class FaceEmbeddingCodecError(ValueError):
    pass


class FaceEmbeddingCodec:
    @staticmethod
    def encode(embedding: np.ndarray) -> str:
        vector = np.asarray(
            embedding,
            dtype="<f4",
        ).reshape(-1)

        FaceEmbeddingCodec._validate(vector)

        return base64.b64encode(vector.tobytes(order="C")).decode("ascii")

    @staticmethod
    def decode(encoded_embedding: str) -> np.ndarray:
        if not encoded_embedding:
            raise FaceEmbeddingCodecError("Encoded embedding is required")

        try:
            raw_bytes = base64.b64decode(
                encoded_embedding,
                validate=True,
            )
        except (binascii.Error, ValueError) as exc:
            raise FaceEmbeddingCodecError("Embedding is not valid Base64") from exc

        expected_size = EMBEDDING_DIMENSION * np.dtype("<f4").itemsize

        if len(raw_bytes) != expected_size:
            raise FaceEmbeddingCodecError(
                f"Embedding must contain exactly {expected_size} bytes"
            )

        vector = np.frombuffer(
            raw_bytes,
            dtype="<f4",
        ).astype(np.float32, copy=True)

        FaceEmbeddingCodec._validate(vector)

        return vector

    @staticmethod
    def _validate(vector: np.ndarray) -> None:
        if vector.shape != (EMBEDDING_DIMENSION,):
            raise FaceEmbeddingCodecError(
                f"Embedding must have {EMBEDDING_DIMENSION} dimensions"
            )

        if not np.all(np.isfinite(vector)):
            raise FaceEmbeddingCodecError("Embedding contains non-finite values")

        norm = float(np.linalg.norm(vector))

        if norm <= 0:
            raise FaceEmbeddingCodecError("Embedding has a zero norm")
