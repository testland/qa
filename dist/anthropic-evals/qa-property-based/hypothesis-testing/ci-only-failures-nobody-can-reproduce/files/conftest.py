import os

from hypothesis import settings

settings.register_profile("dev", max_examples=5, deadline=None)
settings.register_profile("ci", max_examples=500, deadline=None)
settings.load_profile(os.environ.get("HYPOTHESIS_PROFILE", "dev"))
