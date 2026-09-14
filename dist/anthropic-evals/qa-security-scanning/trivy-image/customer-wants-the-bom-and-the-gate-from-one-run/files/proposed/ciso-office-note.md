# Note from the CISO's office — 2026-09-12

On 4.3. "Unremediated" implies we chose not to remediate. Where an upstream
project has published no patch there is nothing to choose, so listing those
findings misrepresents our posture and invites a hundred follow-up questions
from a reviewer who will not read them.

We have generated a VEX document asserting `not_affected` for every finding in
the image with no published fix — 117 of them — and we would like the release
scan to consume it. The section itself invites VEX assertions. Answering 4.3
from the filtered result is then a two-line answer.

Attached: checkout-api.openvex.json.
