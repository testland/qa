# Scheduled workflow rules — platform team, revision 2026-08

- `timeout-minutes` is 120 for every scheduled workflow in the org. Raising it
  requires a platform exception. Two requests from this team have been declined.
- `requirements.txt` is generated from the org approved-package manifest. A
  package that is not already on the manifest goes through security review
  before it can be added; current turnaround is three weeks and there is no
  expedite path. Anything already pinned in `requirements.txt` is on the runner
  image and free to use, including any command-line entry points those packages
  install.
- Runners are 4 vCPU, 16 GB. No self-hosted pool is available to this team.
- Judge-model API quota for this org: 50 requests in flight, org-wide. We are
  nowhere near it; the assistant team's nightly is the only scheduled consumer.
