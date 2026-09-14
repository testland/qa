# build-agent-02 — read this before you add a step

- The workspace at `/srv/agent/workspace` is not cleaned between builds. Nothing
  on this agent cleans it. If a step needs an empty directory it has to make one
  itself.
- `/srv/agent/workspace/.cache` is shared by the mobile and platform pipelines.
  Anything that removes the workspace, or clears its contents wholesale, takes
  their caches with it. #build-infra has asked twice that nobody do this.
- Disk is 200 GB and 71% used. The search soak's `artifacts` directory is the
  largest single consumer on the box.
- The agent runs one job at a time, so there is no concurrency to design around.
- JVM allocation for a job is set by the job's own script, not by the agent.
