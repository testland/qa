# The first-Monday digest goes out on the wrong days

## Problem Description

Fix our monthly digest CronJob (`k8s/digest-cronjob.yaml`, incidents in `docs/incident.md`) and the job code, and write tests for the schedule logic and the job.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: k8s/digest-cronjob.yaml ===============
apiVersion: batch/v1
kind: CronJob
metadata:
  name: monthly-digest
spec:
  # first Monday of the month at 09:00 Cyprus time
  schedule: "CRON_TZ=Asia/Nicosia 0 9 1 * 1"
  concurrencyPolicy: Allow
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: digest
              image: registry.example.com/digest:1.8.0
              command: ["python", "-m", "digest.send"]

=============== FILE: digest/send.py ===============
from digest.db import customers, send_email

def main():
    for c in customers():
        send_email(c.email, "Your monthly digest", render(c))

=============== FILE: docs/incident.md ===============
- The cluster rejected the manifest after a Kubernetes upgrade (schedule validation error).
- Before that: customers got the digest on Monday the 3rd and again on Wednesday the 1st.
- One month two digests arrived 30 seconds apart.
- After a two-day control-plane outage, that month's digest never went out.
