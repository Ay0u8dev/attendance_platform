from fastapi import HTTPException
import pytest

from main import parse_roles, require_role


def test_parse_roles_accepts_plain_and_prefixed_roles():
    assert parse_roles("student, ROLE_TEACHER") == {
        "STUDENT",
        "ROLE_TEACHER",
        "TEACHER",
    }


def test_require_role_accepts_role_prefix():
    require_role("12", "ROLE_STUDENT", "STUDENT")


def test_require_role_rejects_missing_role():
    with pytest.raises(HTTPException) as error:
        require_role("12", "TEACHER", "STUDENT")

    assert error.value.status_code == 403
