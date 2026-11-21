"""Forwarding import for app.routes.submit."""

from app.api.routes.submit import PortalSubmitRequest, router, submit_to_portal

__all__ = ["router", "PortalSubmitRequest", "submit_to_portal"]
