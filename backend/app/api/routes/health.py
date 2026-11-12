"""Health check endpoint: GET /api/health."""

from fastapi import APIRouter

from app.core.config import settings

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check() -> dict[str, str]:
    """Report that the backend is running."""
    return {
        "status": "healthy",
        "application": settings.app_name,
        "version": settings.app_version,
    }
