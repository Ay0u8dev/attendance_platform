import logging
import os

try:
    from prometheus_client import Counter
    from prometheus_fastapi_instrumentator import Instrumentator
except ImportError:  # pragma: no cover - keeps local imports usable before pip install
    Counter = None
    Instrumentator = None


logger = logging.getLogger(__name__)


class _NoopCounter:
    def labels(self, **_: str) -> "_NoopCounter":
        return self

    def inc(self) -> None:
        return None


def configure_tracing() -> None:
    if not os.getenv("APPLICATIONINSIGHTS_CONNECTION_STRING"):
        return
    try:
        from azure.monitor.opentelemetry import configure_azure_monitor
    except ImportError:
        logger.warning("Azure Monitor OpenTelemetry package is not installed")
        return
    configure_azure_monitor(logger_name="app")


def expose_metrics(app) -> None:
    if Instrumentator is None:
        return
    Instrumentator().instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)


def counter(name: str, documentation: str, labelnames: list[str] | None = None):
    if Counter is None:
        return _NoopCounter()
    return Counter(name, documentation, labelnames or [])


FACE_ENROLLMENT_RESULTS = counter(
    "face_enrollment_results_total",
    "Face enrollment attempts by outcome.",
    ["outcome"],
)
FACE_VERIFICATION_RESULTS = counter(
    "face_verification_results_total",
    "Face verification attempts by outcome.",
    ["outcome"],
)
FACE_ATTENDANCE_RESULTS = counter(
    "face_attendance_results_total",
    "Face attendance attempts by outcome.",
    ["outcome"],
)
