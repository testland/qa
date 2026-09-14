# acme-ledger 4.9 — release checklist

- [ ] `release/4.9` green on Jenkins.
- [ ] Artifact published by the `publish` stage and visible in the customer
      repository. This is the jar customers consume; nothing else we build is
      shipped.
- [ ] Mutation score recorded on the sign-off ticket, with the machine-readable
      report (XML) attached so the number can be checked later. **The module
      does not ship below 65.**
- [ ] Release notes drafted.
- [ ] Board sign-off recorded on the ticket.

The Gradle build exists because the platform team is migrating; it has no
`publishing` block yet and produces nothing that leaves the build machine.
