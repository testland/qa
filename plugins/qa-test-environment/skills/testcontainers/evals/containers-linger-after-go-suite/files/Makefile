.PHONY: integration ci-cleanup

integration:
	go test ./internal/... -tags=integration -timeout 20m

ci-cleanup:
	docker rm -f $$(docker ps -aq) 2>/dev/null || true
	docker volume prune -f
