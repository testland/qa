import os

from hypothesis import Phase, settings

# derandomize added 2025-11-03 so that a green run here means the same thing on
# everybody's machine instead of depending on who ran it.
settings.register_profile("dev", max_examples=300, deadline=None, derandomize=True)

settings.register_profile(
    "ci",
    max_examples=300,
    deadline=None,
    phases=[Phase.generate],  # skip the shrink pass, it was eating the runner (2026-08-20)
)

settings.load_profile(os.environ.get("HYPOTHESIS_PROFILE", "dev"))
