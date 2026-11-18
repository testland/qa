During the 09:00 price refresh the pricing service received about 400 identical requests
for the same SKU within one second and rate-limited us. `go test -race ./...` is green, so the
team says the cache is thread-safe.
