"""
사용자 인메모리 저장소 (개발/테스트용)
Phase 5 완료 후 PostgreSQL + SQLAlchemy 으로 교체.

시드 계정:
  admin@pca.dev   / Admin1234!   (admin)
  engineer@pca.dev/ Engineer123! (engineer)
  viewer@pca.dev  / Viewer1234!  (viewer)
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from typing import Optional

from app.core.security import hash_password, verify_password


@dataclass
class UserRecord:
    id:            str
    email:         str
    password_hash: str
    role:          str
    is_active:     bool = True


# 인메모리 저장소
_users: dict[str, UserRecord] = {}  # email → UserRecord


def _seed() -> None:
    seeds = [
        ("admin@pca.local",    "Admin1234!",    "admin"),
        ("engineer@pca.local", "Engineer123!",  "engineer"),
        ("viewer@pca.local",   "Viewer1234!",   "viewer"),
    ]
    for email, pw, role in seeds:
        _users[email] = UserRecord(
            id=str(uuid.uuid4()),
            email=email,
            password_hash=hash_password(pw),
            role=role,
        )


_seed()


def get_by_email(email: str) -> Optional[UserRecord]:
    return _users.get(email)


def get_by_id(user_id: str) -> Optional[UserRecord]:
    return next((u for u in _users.values() if u.id == user_id), None)


def authenticate(email: str, password: str) -> Optional[UserRecord]:
    user = get_by_email(email)
    if user and user.is_active and verify_password(password, user.password_hash):
        return user
    return None


def create_user(email: str, password: str, role: str = "engineer") -> UserRecord:
    if email in _users:
        raise ValueError(f"이미 존재하는 이메일입니다: {email}")
    user = UserRecord(
        id=str(uuid.uuid4()),
        email=email,
        password_hash=hash_password(password),
        role=role,
    )
    _users[email] = user
    return user
