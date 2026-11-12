"""Shared test setup.

* Adds the backend/ folder to the import path so `import app...` works
  when pytest is run from the backend/ folder.
* Registers the `live` marker (tests that call the real Gemini API).
* Blocks real Gemini calls in every test that is NOT marked `live`, so the
  offline suite never depends on the network, the API key, or the quota.
* Prints a clear summary line when live tests were blocked by quota.
"""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

QUOTA_MARKER = "BLOCKED BY QUOTA"


def pytest_configure(config):
    config.addinivalue_line("markers", "live: calls the real Gemini API (needs a key and quota)")


@pytest.fixture(autouse=True)
def _block_live_gemini_in_offline_tests(request, monkeypatch):
    """Offline tests must never reach Google. Tests that need the real client are marked `live`."""
    if request.node.get_closest_marker("live"):
        return

    from app.services import gemini_service

    def _refuse(*args, **kwargs):
        raise RuntimeError("An offline test tried to call the live Gemini API.")

    monkeypatch.setattr(gemini_service, "_get_client", _refuse)


def pytest_terminal_summary(terminalreporter):
    """Report quota blocks clearly, separately from real failures."""
    skipped = terminalreporter.stats.get("skipped", [])
    blocked = [report for report in skipped if QUOTA_MARKER in str(report.longrepr)]
    if blocked:
        terminalreporter.write_sep("=", "LIVE GEMINI STATUS", bold=True, yellow=True)
        terminalreporter.write_line(
            f"{QUOTA_MARKER}: {len(blocked)} live test(s) were not run because the Gemini quota is exhausted. "
            "This is not an application failure. Retry after the quota resets or enable billing."
        )
