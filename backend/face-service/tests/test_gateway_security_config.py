from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SENSITIVE_HEADERS = (
    "X-User-Id",
    "X-User-Role",
    "X-User-Roles",
    "X-User-Email",
    "X-Request-Source",
    "X-Internal-Service-Token",
)


def test_development_gateway_sanitizes_before_forward_auth():
    config = (ROOT / "traefik" / "routes.dev.yml").read_text(encoding="utf-8")
    compose = (ROOT / "docker-compose.yml").read_text(encoding="utf-8")
    for header in SENSITIVE_HEADERS:
        assert f'{header}: ""' in config
    assert (
        '["sanitize-auth-headers", "forward-auth", "inject-face-internal-token", "strip-api-face"]'
        in config
    )
    assert 'X-Internal-Service-Token: \'{{ env "FACE_SERVICE_INTERNAL_TOKEN" }}\'' in config
    assert '["sanitize-auth-headers", "forward-auth", "strip-api-attendance"]' in config
    assert "!PathPrefix(`/api/attendance/internal`)" in config
    assert "!PathPrefix(`/api/users/internal`)" in config
    for header in ("X-User-Id", "X-User-Roles", "X-User-Email"):
        assert f'- "{header}"' in config
    assert "env_file:\n      - .env" in compose


def test_production_gateway_has_equivalent_security_chain():
    config = (ROOT / "docker-compose.prod.yml").read_text(encoding="utf-8")
    for header in SENSITIVE_HEADERS:
        assert f"customrequestheaders.{header}=" in config
    assert (
        "face.middlewares=sanitize-auth-headers,forward-auth,inject-face-internal-token,strip-api-face"
        in config
    )
    assert (
        "inject-face-internal-token.headers.customrequestheaders.X-Internal-Service-Token=${FACE_SERVICE_INTERNAL_TOKEN}"
        in config
    )
    assert (
        "attendance.middlewares=sanitize-auth-headers,forward-auth,strip-api-attendance"
        in config
    )
    assert "!PathPrefix(`/api/attendance/internal`)" in config
    assert "!PathPrefix(`/api/users/internal`)" in config or "user.rules=PathPrefix(`/api/users`) && !PathPrefix(`/api/users/internal`)" in config
    assert "authResponseHeaders=X-User-Id,X-User-Roles,X-User-Email" in config
    assert "env_file:\n      - .env.prod" in config
