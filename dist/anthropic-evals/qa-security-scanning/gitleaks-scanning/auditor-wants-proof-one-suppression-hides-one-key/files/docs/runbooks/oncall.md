# On-call runbook (excerpt, lines 84-92)

## Posting a manual incident notice

If PagerDuty has not fired, post to `#inc-bridge` yourself.

EXAMPLE curl -H 'Authorization: Bearer xoxb-[REDACTED-IN-EVIDENCE-BUNDLE]' \
  -d 'channel=inc-bridge' -d 'text=manual notice' \
  https://slack.com/api/chat.postMessage

The bot token above is the real `vantage-oncall` workspace bot token; it is in
the runbook so responders can paste the command during an incident.
