# Pact CI integration

A complete CI flow per side wires publish, provider verification, and the
`can-i-deploy` gate into the pipeline. Both sides read `PACT_BROKER_BASE_URL`
and `PACT_BROKER_TOKEN` from CI secrets.

## Consumer pipeline

```yaml
- name: Run consumer tests + publish pact
  env:
    PACT_BROKER_BASE_URL: ${{ secrets.PACT_BROKER_BASE_URL }}
    PACT_BROKER_TOKEN:    ${{ secrets.PACT_BROKER_TOKEN }}
  run: |
    npm test                           # writes ./pacts/<consumer>-<provider>.json
    npx pact-broker publish ./pacts \
      --consumer-app-version=$GITHUB_SHA \
      --branch=${GITHUB_REF##*/}

- name: Can I deploy?
  env:
    PACT_BROKER_BASE_URL: ${{ secrets.PACT_BROKER_BASE_URL }}
    PACT_BROKER_TOKEN:    ${{ secrets.PACT_BROKER_TOKEN }}
  run: |
    pact-broker can-i-deploy \
      --pacticipant=web-app \
      --version=$GITHUB_SHA \
      --to-environment=production
```

## Provider pipeline

```yaml
- name: Verify pacts from broker
  env:
    PACT_BROKER_BASE_URL: ${{ secrets.PACT_BROKER_BASE_URL }}
    PACT_BROKER_TOKEN:    ${{ secrets.PACT_BROKER_TOKEN }}
  run: |
    npm run start:provider &
    npx wait-on http://localhost:8081
    npm run verify:pact                # publishVerificationResult: true

- name: Can I deploy?
  env:
    PACT_BROKER_BASE_URL: ${{ secrets.PACT_BROKER_BASE_URL }}
    PACT_BROKER_TOKEN:    ${{ secrets.PACT_BROKER_TOKEN }}
  run: |
    pact-broker can-i-deploy \
      --pacticipant=pet-service \
      --version=$GITHUB_SHA \
      --to-environment=production
```

`can-i-deploy` is the actual gate - pact verification happens in step 1, but a
green verification alone doesn't prove every paired version is compatible.
